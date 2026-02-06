import { requireAuth } from "../_lib/auth";
import { sendJson, methodNotAllowed } from "../_lib/http";
import { sql } from "../_lib/db";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return methodNotAllowed(res);
  try {
    const auth = await requireAuth(req);
    const db = sql();
    const rows = await db<{ id: string; email: string; role: "admin" | "user"; tenant_id: string | null }>`
      select id, email, role, tenant_id from users where id = ${auth.userId} limit 1
    `;
    const user = rows[0];
    if (!user) return sendJson(res, 401, { error: "Invalid token" });
    return sendJson(res, 200, { user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenant_id } });
  } catch (e: any) {
    return sendJson(res, 401, { error: e?.message ?? "Unauthorized" });
  }
}

