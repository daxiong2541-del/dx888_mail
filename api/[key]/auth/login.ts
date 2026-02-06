import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApiKey } from "../../_lib/auth";
import { sql } from "../../_lib/db";
import { verifyPassword } from "../../_lib/password";
import { setSessionCookie } from "../../_lib/session";
import { badRequest, json, methodNotAllowed } from "../../_lib/response";

type UserRow = {
  id: number;
  tenant_id: number | null;
  role: "admin" | "user";
  email: string;
  password_hash: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!requireApiKey(req, res)) return;

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const email = body?.email;
  const password = body?.password;
  if (typeof email !== "string" || !email) return badRequest(res, "Missing email");
  if (typeof password !== "string" || !password) return badRequest(res, "Missing password");

  const db = sql();
  const rows = await db<UserRow[]>`
    select id, tenant_id, role, email, password_hash
    from app_users
    where lower(email) = lower(${email})
    limit 1
  `;
  const user = rows?.[0];
  if (!user) return json(res, 200, { code: 401, message: "invalid credentials" });
  if (!verifyPassword(password, user.password_hash)) return json(res, 200, { code: 401, message: "invalid credentials" });

  setSessionCookie(res, { uid: user.id, role: user.role, tid: user.tenant_id });
  return json(res, 200, { code: 200, message: "success", data: { role: user.role, email: user.email, tenantId: user.tenant_id } });
}

