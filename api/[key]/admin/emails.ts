import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApiKey } from "../../_lib/auth";
import { requireAdmin } from "../../_lib/guard";
import { sql } from "../../_lib/db";
import { json, methodNotAllowed } from "../../_lib/response";

type EmailRow = {
  tenantId: number | null;
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
  if (req.method !== "GET") return methodNotAllowed(res);
  if (!requireApiKey(req, res)) return;
  if (!requireAdmin(req, res)) return;

  const toEmail = typeof req.query.toEmail === "string" && req.query.toEmail ? req.query.toEmail : null;
  const db = sql();

  const rows = await db<EmailRow[]>`
    select
      tenant_id as "tenantId",
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
    where is_del = 0
      and (${toEmail}::text is null or to_email = ${toEmail})
    order by create_time desc
    limit 100
  `;

  return json(res, 200, { code: 200, message: "success", data: rows ?? [] });
}

