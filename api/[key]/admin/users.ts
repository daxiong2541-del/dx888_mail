import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApiKey } from "../../_lib/auth";
import { requireAdmin } from "../../_lib/guard";
import { sql } from "../../_lib/db";
import { hashPassword } from "../../_lib/password";
import { badRequest, json, methodNotAllowed } from "../../_lib/response";

type AppUserRow = { id: number; tenant_id: number | null; role: string; email: string; created_at: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireApiKey(req, res)) return;
  if (!requireAdmin(req, res)) return;

  const db = sql();

  if (req.method === "GET") {
    const rows = await db`
      select id, tenant_id, role, email, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
      from app_users
      order by id desc
      limit 500
    `;
    return json(res, 200, { code: 200, message: "success", data: (rows as AppUserRow[]) ?? [] });
  }

  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const email = body?.email;
    const password = body?.password;
    const role = body?.role ?? "user";
    const tenantId = body?.tenantId === null || body?.tenantId === undefined ? null : Number(body.tenantId);

    if (typeof email !== "string" || !email) return badRequest(res, "Missing email");
    if (typeof password !== "string" || !password) return badRequest(res, "Missing password");
    if (role !== "admin" && role !== "user") return badRequest(res, "Invalid role");
    if (role === "user" && !Number.isFinite(tenantId)) return badRequest(res, "Missing tenantId");

    const passwordHash = hashPassword(password);
    const rows = await db`
      insert into app_users (tenant_id, role, email, password_hash)
      values (${tenantId}, ${role}, ${email}, ${passwordHash})
      on conflict (email) do update
      set tenant_id = excluded.tenant_id,
          role = excluded.role,
          password_hash = excluded.password_hash
      returning id, tenant_id, role, email, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
    `;
    return json(res, 200, { code: 200, message: "success", data: (rows as AppUserRow[] | undefined)?.[0] ?? null });
  }

  return methodNotAllowed(res);
}
