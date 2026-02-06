import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApiKey } from "../../_lib/auth";
import { getSession } from "../../_lib/session";
import { json, methodNotAllowed } from "../../_lib/response";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  if (!requireApiKey(req, res)) return;
  const session = getSession(req);
  if (!session) return json(res, 200, { code: 200, message: "success", data: null });
  return json(res, 200, { code: 200, message: "success", data: { role: session.role, userId: session.uid, tenantId: session.tid } });
}

