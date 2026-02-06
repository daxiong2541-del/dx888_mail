import { sendJson, methodNotAllowed } from "../../_lib/http";
import { sql } from "../../_lib/db";
import { optionalEnv, requireEnv } from "../../_lib/env";

function mailApiBaseUrl() {
  return (optionalEnv("MAIL_API_BASE_URL") ?? "https://mail.dynmsl.com/api/public").replace(/\/+$/, "");
}

async function fetchEmails(toEmail: string) {
  const url = `${mailApiBaseUrl()}/emailList`;
  const token = requireEnv("MAIL_API_TOKEN");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({ toEmail })
  });
  if (!res.ok) {
    throw new Error(`Mail API failed: ${res.status}`);
  }
  const data = await res.json();
  if (data?.code !== 200) {
    throw new Error(data?.message ?? "Mail API error");
  }
  return data.data ?? [];
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return methodNotAllowed(res);
  try {
    const token = String(req.query?.token ?? "");
    if (!token) return sendJson(res, 400, { error: "Missing token" });

    const db = sql();
    const rows = await db<{
      id: string;
      mailbox_email: string;
      max_queries: number;
      queries_used: number;
      expires_at: string;
    }>`
      select
        s.id,
        m.email as mailbox_email,
        s.max_queries,
        s.queries_used,
        s.expires_at
      from share_links s
      join mailboxes m on m.id = s.mailbox_id
      where s.token = ${token}
      limit 1
    `;
    const link = rows[0];
    if (!link) return sendJson(res, 404, { error: "Link not found" });

    const expiresAt = new Date(link.expires_at).getTime();
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
      return sendJson(res, 410, { error: "Link expired" });
    }
    if (link.queries_used >= link.max_queries) {
      return sendJson(res, 429, { error: "Query limit reached" });
    }

    const updated = await db<{ queries_used: number }>`
      update share_links
      set queries_used = queries_used + 1
      where id = ${link.id} and queries_used < max_queries and expires_at > now()
      returning queries_used
    `;
    if (!updated[0]) return sendJson(res, 429, { error: "Query limit reached" });

    const emails = await fetchEmails(link.mailbox_email);
    return sendJson(res, 200, {
      mailbox: { email: link.mailbox_email },
      usage: { maxQueries: link.max_queries, queriesUsed: updated[0].queries_used, expiresAt: link.expires_at },
      emails
    });
  } catch (e: any) {
    return sendJson(res, 500, { error: e?.message ?? "Server error" });
  }
}

