import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApiKey, requireAuthToken } from "../../_lib/auth";
import { sql } from "../../_lib/db";
import { badRequest, json, methodNotAllowed } from "../../_lib/response";

type UserInput = {
  email: string;
  password: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!requireApiKey(req, res)) return;
  if (!requireAuthToken(req, res)) return;

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const list = body?.list;
  if (!Array.isArray(list) || list.length === 0) {
    return badRequest(res, "Missing list");
  }

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
    insert into users (email, password)
    select * from unnest(${emails}::text[], ${passwords}::text[])
    on conflict (email)
    do update set password = excluded.password
  `;

  return json(res, 200, { code: 200, message: "success" });
}

