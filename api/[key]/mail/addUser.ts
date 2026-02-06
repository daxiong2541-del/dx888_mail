import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApiKey } from "../../_lib/auth";
import { getSession } from "../../_lib/session";
import { sql } from "../../_lib/db";
import { badRequest, json, methodNotAllowed } from "../../_lib/response";

type UserInput = {
  email: string;
  password: string;
};

function isAdminByToken(req: VercelRequest) {
  const token = process.env.DX888_AUTH_TOKEN ?? "";
  if (!token) return false;
  return (req.headers.authorization ?? "") === token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!requireApiKey(req, res)) return;

  const session = getSession(req);
  const isAdmin = session?.role === "admin" || isAdminByToken(req);
  if (!isAdmin) return json(res, 200, { code: 403, message: "forbidden" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const list = body?.list;
  if (!Array.isArray(list) || list.length === 0) return badRequest(res, "Missing list");

  const users: UserInput[] = [];
  for (const item of list) {
    const email = item?.email;
    const password = item?.password;
    if (typeof email !== "string" || !email) return badRequest(res, "Invalid email");
    if (typeof password !== "string" || !password) return badRequest(res, "Invalid password");
    users.push({ email, password });
  }

  const emails = users.map((u) => u.email);
  const passwords = users.map((u) => u.password);

  const db = sql();
  await db`
    insert into mail_users (email, password)
    select * from unnest(${emails}::text[], ${passwords}::text[])
    on conflict (email)
    do update set password = excluded.password
  `;

  return json(res, 200, { code: 200, message: "success" });
}

