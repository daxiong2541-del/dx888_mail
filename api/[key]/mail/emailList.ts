import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApiKey } from "../../_lib/auth";
import { sql } from "../../_lib/db";
import { getSession } from "../../_lib/session";
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

function isAdminByToken(req: VercelRequest) {
  const token = process.env.DX888_AUTH_TOKEN ?? "";
  if (!token) return false;
  return (req.headers.authorization ?? "") === token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!requireApiKey(req, res)) return;

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const toEmail = body?.toEmail;
  if (typeof toEmail !== "string" || !toEmail) return badRequest(res, "Missing toEmail");

  const session = getSession(req);
  const isAdmin = session?.role === "admin" || isAdminByToken(req);
  const tenantId = session?.role === "user" ? session.tid : null;

  if (!isAdmin && (!session || session.role !== "user")) {
    return json(res, 200, { code: 401, message: "not logged in" });
  }
  if (!isAdmin && !tenantId) {
    return json(res, 200, { code: 403, message: "missing tenant" });
  }

  const db = sql();
  if (!isAdmin) {
    const domain = toEmail.split("@").slice(-1)[0]?.toLowerCase() ?? "";
    const domains = await db<{ ok: number }[]>`
      select 1 as ok
      from tenant_domains
      where tenant_id = ${tenantId}
        and domain = ${domain}
      limit 1
    `;
    if (!domains?.[0]?.ok) {
      return json(res, 200, { code: 403, message: "forbidden" });
    }
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
    where to_email = ${toEmail}
      and is_del = 0
      and (${isAdmin}::boolean = true or tenant_id = ${tenantId})
    order by create_time desc
    limit 50
  `;

  return json(res, 200, { code: 200, message: "success", data: rows ?? [] });
}

