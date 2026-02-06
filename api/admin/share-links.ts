import { requireAuth, randomToken } from "../_lib/auth";
import { readJson, sendJson, methodNotAllowed } from "../_lib/http";
import { sql } from "../_lib/db";

type CreateBody = { mailboxId?: string; maxQueries?: number; expiresInMinutes?: number };

export default async function handler(req: any, res: any) {
  try {
    const auth = await requireAuth(req);
    if (auth.role !== "admin") return sendJson(res, 403, { error: "Forbidden" });
    const db = sql();

    if (req.method === "GET") {
      const rows = await db<{
        id: string;
        token: string;
        max_queries: number;
        queries_used: number;
        expires_at: string;
        created_at: string;
        mailbox_email: string;
        tenant_name: string;
      }>`
        select
          s.id, s.token, s.max_queries, s.queries_used, s.expires_at, s.created_at,
          m.email as mailbox_email,
          t.name as tenant_name
        from share_links s
        join mailboxes m on m.id = s.mailbox_id
        join tenants t on t.id = s.tenant_id
        order by s.created_at desc
        limit 200
      `;
      return sendJson(res, 200, { shareLinks: rows });
    }

    if (req.method === "POST") {
      const body = await readJson<CreateBody>(req);
      const mailboxId = body.mailboxId ?? "";
      const maxQueries = Math.max(1, Math.min(100000, Math.floor(body.maxQueries ?? 10)));
      const expiresInMinutes = Math.max(1, Math.min(525600, Math.floor(body.expiresInMinutes ?? 60)));
      if (!mailboxId) return sendJson(res, 400, { error: "Missing mailboxId" });

      const mailboxRows = await db<{ tenant_id: string }>`
        select tenant_id from mailboxes where id = ${mailboxId} limit 1
      `;
      const mailbox = mailboxRows[0];
      if (!mailbox) return sendJson(res, 404, { error: "Mailbox not found" });

      const token = randomToken();
      const rows = await db<{
        id: string;
        token: string;
        max_queries: number;
        queries_used: number;
        expires_at: string;
        created_at: string;
      }>`
        insert into share_links (tenant_id, mailbox_id, token, max_queries, expires_at)
        values (${mailbox.tenant_id}, ${mailboxId}, ${token}, ${maxQueries}, now() + (${expiresInMinutes}::int * interval '1 minute'))
        returning id, token, max_queries, queries_used, expires_at, created_at
      `;
      return sendJson(res, 201, { shareLink: rows[0] });
    }

    return methodNotAllowed(res);
  } catch (e: any) {
    return sendJson(res, 401, { error: e?.message ?? "Unauthorized" });
  }
}

