import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApiKey, requireAuthToken } from "../../_lib/auth";
import { sql } from "../../_lib/db";
import { badRequest, json, methodNotAllowed } from "../../_lib/response";

type EmailRow = {
  emailId: number;
  sendEmail: string | null;
  sendName: string | null;
  subject: string | null;
  toEmail: string;
  toName: string | null;
  createTime: string;
  type: number | null;
  content: string | null;
  text: string | null;
  isDel: number;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!requireApiKey(req, res)) return;
  if (!requireAuthToken(req, res)) return;

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const toEmail = body?.toEmail;
  if (typeof toEmail !== "string" || !toEmail) {
    return badRequest(res, "Missing toEmail");
  }

  const db = sql();
  const rows = await db<EmailRow[]>`
    select
      id as "emailId",
      send_email as "sendEmail",
      send_name as "sendName",
      subject,
      to_email as "toEmail",
      to_name as "toName",
      to_char(create_time, 'YYYY-MM-DD HH24:MI:SS') as "createTime",
      type as "type",
      content,
      text,
      is_del as "isDel"
    from emails
    where to_email = ${toEmail}
      and is_del = 0
    order by create_time desc
    limit 50
  `;

  return json(res, 200, { code: 200, message: "success", data: rows ?? [] });
}

