import { requireAuth } from "../_lib/auth";
import { sendJson, methodNotAllowed } from "../_lib/http";
import { sql } from "../_lib/db";

export default async function handler(req: any, res: any) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== "admin") return sendJson(res, 403, { error: "Forbidden" });
    if (req.method !== "GET") return methodNotAllowed(res);

    const db = sql();
    const rows = await db<{
      id: string;
      email: string;
      tenant_id: string;
      tenant_name: string;
      created_at: string;
    }>`
      select m.id, m.email, m.tenant_id, t.name as tenant_name, m.created_at
      from mailboxes m
      join tenants t on t.id = m.tenant_id
      order by m.created_at desc
      limit 500
    `;
    return sendJson(res, 200, { mailboxes: rows });
  } catch (e: any) {
    return sendJson(res, 401, { error: e?.message ?? "Unauthorized" });
  }
}

