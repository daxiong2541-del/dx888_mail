import { sql } from "../_lib/db";
import { readJson, sendJson, methodNotAllowed } from "../_lib/http";
import { hashPassword, signAuthToken, verifyPassword } from "../_lib/auth";
import { optionalEnv } from "../_lib/env";

type Body = { email?: string; password?: string };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const body = await readJson<Body>(req);
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || !password) {
      return sendJson(res, 400, { error: "Missing email or password" });
    }

    const db = sql();
    const rows = await db<
      { id: string; tenant_id: string | null; role: "admin" | "user"; password_hash: string }
    >`select id, tenant_id, role, password_hash from users where email = ${email} limit 1`;

    let user = rows[0];

    if (!user) {
      const bootstrapEmail = optionalEnv("ADMIN_BOOTSTRAP_EMAIL")?.trim().toLowerCase();
      const bootstrapPassword = optionalEnv("ADMIN_BOOTSTRAP_PASSWORD") ?? "";
      if (bootstrapEmail && email === bootstrapEmail && password === bootstrapPassword) {
        const tenantRows = await db<{ id: string }>`
          insert into tenants (name) values ('admin') returning id
        `;
        const passwordHash = await hashPassword(password);
        const userRows = await db<{ id: string; tenant_id: string; role: "admin" | "user" }>`
          insert into users (tenant_id, email, password_hash, role)
          values (${tenantRows[0]!.id}, ${email}, ${passwordHash}, 'admin')
          returning id, tenant_id, role
        `;
        const created = userRows[0]!;
        const token = await signAuthToken({
          userId: created.id,
          role: created.role,
          tenantId: created.tenant_id
        });
        return sendJson(res, 200, { token, user: { id: created.id, email, role: created.role } });
      }
      return sendJson(res, 401, { error: "Invalid credentials" });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return sendJson(res, 401, { error: "Invalid credentials" });
    }

    const token = await signAuthToken({
      userId: user.id,
      role: user.role,
      tenantId: user.tenant_id
    });
    return sendJson(res, 200, { token, user: { id: user.id, email, role: user.role } });
  } catch (e: any) {
    return sendJson(res, 500, { error: e?.message ?? "Server error" });
  }
}

