import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApiKey } from "../../_lib/auth";
import { requireAdmin } from "../../_lib/guard";
import { sql } from "../../_lib/db";
import { badRequest, json, methodNotAllowed } from "../../_lib/response";

type TenantRow = { id: number; name: string; created_at: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireApiKey(req, res)) return;
  if (!requireAdmin(req, res)) return;

  const db = sql();

  if (req.method === "GET") {
    const rows = await db<TenantRow[]>`
      select id, name, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
      from tenants
      order by id desc
      limit 200
    `;
    return json(res, 200, { code: 200, message: "success", data: rows ?? [] });
  }

  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const name = body?.name;
    if (typeof name !== "string" || !name) return badRequest(res, "Missing name");
    const rows = await db<TenantRow[]>`
      insert into tenants (name) values (${name})
      on conflict (name) do update set name = excluded.name
      returning id, name, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
    `;
    return json(res, 200, { code: 200, message: "success", data: rows?.[0] ?? null });
  }

  return methodNotAllowed(res);
}

