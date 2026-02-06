import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApiKey } from "../../_lib/auth";
import { sql } from "../../_lib/db";
import { hashPassword } from "../../_lib/password";
import { badRequest, json, methodNotAllowed, unauthorized } from "../../_lib/response";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!requireApiKey(req, res)) return;

  const secret = process.env.DX888_BOOTSTRAP_SECRET ?? "";
  if (!secret) return unauthorized(res);
  if (req.headers["x-bootstrap-secret"] !== secret) return unauthorized(res);

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const email = body?.email;
  const password = body?.password;
  if (typeof email !== "string" || !email) return badRequest(res, "Missing email");
  if (typeof password !== "string" || !password) return badRequest(res, "Missing password");

  const db = sql();
  const existing = await db<{ c: number }[]>`select count(*)::int as c from app_users where role = 'admin'`;
  if ((existing?.[0]?.c ?? 0) > 0) return json(res, 200, { code: 409, message: "admin exists" });

  const passwordHash = hashPassword(password);
  await db`
    insert into app_users (tenant_id, role, email, password_hash)
    values (null, 'admin', ${email}, ${passwordHash})
  `;

  return json(res, 200, { code: 200, message: "success" });
}

