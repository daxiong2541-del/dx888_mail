import { requireAuth, hashPassword } from "../_lib/auth";
import { readJson, sendJson, methodNotAllowed } from "../_lib/http";
import { sql } from "../_lib/db";

type CreateBody = { email?: string; password?: string; tenantName?: string };

export default async function handler(req: any, res: any) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== "admin") return sendJson(res, 403, { error: "Forbidden" });

    const db = sql();

    if (req.method === "GET") {
      const rows = await db<{
        id: string;
        email: string;
        role: "admin" | "user";
        tenant_id: string | null;
        tenant_name: string | null;
        created_at: string;
      }>`
        select
          u.id, u.email, u.role, u.tenant_id,
          t.name as tenant_name,
          u.created_at
        from users u
        left join tenants t on t.id = u.tenant_id
        order by u.created_at desc
        limit 200
      `;
      return sendJson(res, 200, { users: rows });
    }

    if (req.method === "POST") {
      const body = await readJson<CreateBody>(req);
      const email = (body.email ?? "").trim().toLowerCase();
      const password = body.password ?? "";
      const tenantName = (body.tenantName ?? "").trim() || email;
      if (!email || !password) return sendJson(res, 400, { error: "Missing email or password" });

      const existing = await db<{ id: string }>`select id from users where email = ${email} limit 1`;
      if (existing[0]) return sendJson(res, 409, { error: "Email already exists" });

      const tenantRows = await db<{ id: string }>`
        insert into tenants (name) values (${tenantName}) returning id
      `;
      const passwordHash = await hashPassword(password);
      const userRows = await db<{ id: string; email: string; role: "admin" | "user"; tenant_id: string }>`
        insert into users (tenant_id, email, password_hash, role)
        values (${tenantRows[0]!.id}, ${email}, ${passwordHash}, 'user')
        returning id, email, role, tenant_id
      `;
      return sendJson(res, 201, { user: userRows[0] });
    }

    return methodNotAllowed(res);
  } catch (e: any) {
    return sendJson(res, 401, { error: e?.message ?? "Unauthorized" });
  }
}

