import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApiKey } from "../../_lib/auth";
import { requireAdmin } from "../../_lib/guard";
import { sql } from "../../_lib/db";
import { badRequest, json, methodNotAllowed } from "../../_lib/response";

type GuestLinkRow = {
  id: number;
  tenant_id: number | null;
  token: string;
  scope_type: string;
  scope_value: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_by_user_id: number | null;
  created_at: string;
};

function randomToken() {
  const buf = crypto.randomBytes(18);
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireApiKey(req, res)) return;
  const session = requireAdmin(req, res);
  if (!session) return;

  const db = sql();

  if (req.method === "GET") {
    const rows = await db`
      select
        id,
        tenant_id,
        token,
        scope_type,
        scope_value,
        max_uses,
        used_count,
        case when expires_at is null then null else to_char(expires_at, 'YYYY-MM-DD HH24:MI:SS') end as expires_at,
        created_by_user_id,
        to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
      from guest_links
      order by id desc
      limit 500
    `;
    return json(res, 200, { code: 200, message: "success", data: (rows as GuestLinkRow[]) ?? [] });
  }

  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const scopeType = body?.scopeType;
    const scopeValueRaw = body?.scopeValue;
    const maxUses = Number(body?.maxUses ?? 0);
    const tenantId = body?.tenantId === null || body?.tenantId === undefined ? null : Number(body.tenantId);
    const expiresAt = typeof body?.expiresAt === "string" && body.expiresAt ? body.expiresAt : null;

    if (scopeType !== "email" && scopeType !== "domain") return badRequest(res, "Invalid scopeType");
    if (typeof scopeValueRaw !== "string" || !scopeValueRaw) return badRequest(res, "Missing scopeValue");
    if (!Number.isFinite(maxUses) || maxUses < 0) return badRequest(res, "Invalid maxUses");
    if (scopeType === "domain" && !Number.isFinite(tenantId)) return badRequest(res, "Missing tenantId");
    if (scopeType === "email" && !Number.isFinite(tenantId)) return badRequest(res, "Missing tenantId");

    const scopeValue = scopeValueRaw.trim().toLowerCase();
    const token = randomToken();

    const rows = await db`
      insert into guest_links (
        tenant_id,
        token,
        scope_type,
        scope_value,
        max_uses,
        used_count,
        expires_at,
        created_by_user_id
      ) values (
        ${tenantId},
        ${token},
        ${scopeType},
        ${scopeValue},
        ${maxUses},
        0,
        ${expiresAt}::timestamptz,
        ${session.uid}
      )
      returning
        id,
        tenant_id,
        token,
        scope_type,
        scope_value,
        max_uses,
        used_count,
        case when expires_at is null then null else to_char(expires_at, 'YYYY-MM-DD HH24:MI:SS') end as expires_at,
        created_by_user_id,
        to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
    `;
    return json(res, 200, { code: 200, message: "success", data: (rows as GuestLinkRow[] | undefined)?.[0] ?? null });
  }

  return methodNotAllowed(res);
}
