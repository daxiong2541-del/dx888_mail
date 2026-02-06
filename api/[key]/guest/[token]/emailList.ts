import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApiKey } from "../../../_lib/auth";
import { sql } from "../../../_lib/db";
import { badRequest, json, methodNotAllowed } from "../../../_lib/response";

type GuestRow = {
  tenant_id: number | null;
  scope_type: "email" | "domain";
  scope_value: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
};

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

  const token = req.query.token;
  if (typeof token !== "string" || !token) return badRequest(res, "Missing token");

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const inputToEmail = typeof body?.toEmail === "string" ? body.toEmail : "";

  const db = sql();
  const updated = await db<GuestRow[]>`
    update guest_links
    set used_count = used_count + 1
    where token = ${token}
      and (expires_at is null or expires_at > now())
      and (max_uses = 0 or used_count < max_uses)
    returning tenant_id, scope_type, scope_value, max_uses, used_count, case when expires_at is null then null else to_char(expires_at, 'YYYY-MM-DD HH24:MI:SS') end as expires_at
  `;
  const link = updated?.[0];
  if (!link) return json(res, 200, { code: 403, message: "link expired or exhausted" });
  if (!link.tenant_id) return json(res, 200, { code: 403, message: "invalid link" });

  let toEmail = inputToEmail.trim().toLowerCase();
  if (link.scope_type === "email") {
    toEmail = link.scope_value;
  } else {
    if (!toEmail) return badRequest(res, "Missing toEmail");
    const domain = toEmail.split("@").slice(-1)[0]?.toLowerCase() ?? "";
    if (domain !== link.scope_value) return json(res, 200, { code: 403, message: "forbidden" });
  }

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
    where tenant_id = ${link.tenant_id}
      and to_email = ${toEmail}
      and is_del = 0
    order by create_time desc
    limit 50
  `;

  return json(res, 200, { code: 200, message: "success", data: rows ?? [] });
}

