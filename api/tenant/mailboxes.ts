import { requireAuth } from "../_lib/auth";
import { readJson, sendJson, methodNotAllowed } from "../_lib/http";
import { sql } from "../_lib/db";

type CreateBody = { email?: string };

export default async function handler(req: any, res: any) {
  try {
    const auth = await requireAuth(req);
    if (!auth.tenantId) return sendJson(res, 403, { error: "Forbidden" });
    const db = sql();

    if (req.method === "GET") {
      const rows = await db<{ id: string; email: string; created_at: string }>`
        select id, email, created_at
        from mailboxes
        where tenant_id = ${auth.tenantId}
        order by created_at desc
        limit 500
      `;
      return sendJson(res, 200, { mailboxes: rows });
    }

    if (req.method === "POST") {
      const body = await readJson<CreateBody>(req);
      const email = (body.email ?? "").trim().toLowerCase();
      if (!email.includes("@")) return sendJson(res, 400, { error: "Invalid email" });

      const rows = await db<{ id: string; email: string; created_at: string }>`
        insert into mailboxes (tenant_id, email)
        values (${auth.tenantId}, ${email})
        on conflict (tenant_id, email) do update set email = excluded.email
        returning id, email, created_at
      `;
      return sendJson(res, 201, { mailbox: rows[0] });
    }

    return methodNotAllowed(res);
  } catch (e: any) {
    return sendJson(res, 401, { error: e?.message ?? "Unauthorized" });
  }
}

