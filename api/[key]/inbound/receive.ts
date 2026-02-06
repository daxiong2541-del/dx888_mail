import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApiKey } from "../../_lib/auth";
import { sql } from "../../_lib/db";
import { badRequest, json, methodNotAllowed, unauthorized } from "../../_lib/response";

type ReceiveBody = {
  sendEmail?: string;
  sendName?: string;
  subject?: string;
  toEmail?: string;
  toName?: string;
  createTime?: string;
  type?: number;
  content?: string;
  text?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!requireApiKey(req, res)) return;

  const inboundSecret = process.env.DX888_INBOUND_SECRET ?? "";
  if (inboundSecret) {
    const secret = req.headers["x-inbound-secret"];
    if (secret !== inboundSecret) {
      return unauthorized(res);
    }
  }

  const body: ReceiveBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const toEmail = body?.toEmail;
  if (typeof toEmail !== "string" || !toEmail) return badRequest(res, "Missing toEmail");

  const createTime = typeof body.createTime === "string" ? body.createTime : null;
  const type = typeof body.type === "number" ? body.type : 0;
  const domain = toEmail.split("@").slice(-1)[0]?.toLowerCase() ?? "";

  const db = sql();
  const tenantRows = await db`
    select tenant_id
    from tenant_domains
    where domain = ${domain}
    limit 1
  `;
  const tenantId = (tenantRows as Array<{ tenant_id: number }> | undefined)?.[0]?.tenant_id ?? null;

  await db`
    insert into emails (
      tenant_id,
      send_email,
      send_name,
      subject,
      to_email,
      to_name,
      create_time,
      type,
      content,
      text,
      is_del
    ) values (
      ${tenantId},
      ${typeof body.sendEmail === "string" ? body.sendEmail : null},
      ${typeof body.sendName === "string" ? body.sendName : null},
      ${typeof body.subject === "string" ? body.subject : null},
      ${toEmail},
      ${typeof body.toName === "string" ? body.toName : null},
      coalesce(${createTime}::timestamptz, now()),
      ${type},
      ${typeof body.content === "string" ? body.content : null},
      ${typeof body.text === "string" ? body.text : null},
      0
    )
  `;

  return json(res, 200, { code: 200, message: "success" });
}
