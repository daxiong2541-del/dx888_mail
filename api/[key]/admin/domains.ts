import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApiKey } from "../../_lib/auth";
import { requireAdmin } from "../../_lib/guard";
import { sql } from "../../_lib/db";
import { badRequest, json, methodNotAllowed } from "../../_lib/response";

type DomainRow = { id: number; tenant_id: number; domain: string; created_at: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireApiKey(req, res)) return;
  if (!requireAdmin(req, res)) return;

  const db = sql();

  if (req.method === "GET") {
    const tenantIdRaw = req.query.tenantId;
    const tenantId = typeof tenantIdRaw === "string" ? Number(tenantIdRaw) : NaN;
    if (!Number.isFinite(tenantId)) return badRequest(res, "Missing tenantId");
    const rows = await db<DomainRow[]>`
      select id, tenant_id, domain, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
      from tenant_domains
      where tenant_id = ${tenantId}
      order by id desc
      limit 500
    `;
    return json(res, 200, { code: 200, message: "success", data: rows ?? [] });
  }

  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const tenantId = Number(body?.tenantId);
    const domainRaw = body?.domain;
    if (!Number.isFinite(tenantId)) return badRequest(res, "Missing tenantId");
    if (typeof domainRaw !== "string" || !domainRaw) return badRequest(res, "Missing domain");
    const domain = domainRaw.trim().toLowerCase();
    const rows = await db<DomainRow[]>`
      insert into tenant_domains (tenant_id, domain) values (${tenantId}, ${domain})
      on conflict (domain) do update set tenant_id = excluded.tenant_id
      returning id, tenant_id, domain, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
    `;
    return json(res, 200, { code: 200, message: "success", data: rows?.[0] ?? null });
  }

  return methodNotAllowed(res);
}

