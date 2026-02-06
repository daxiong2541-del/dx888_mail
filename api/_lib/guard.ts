import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSession } from "./session";
import { json } from "./response";

export function requireSession(req: VercelRequest, res: VercelResponse) {
  const session = getSession(req);
  if (!session) {
    json(res, 200, { code: 401, message: "not logged in" });
    return null;
  }
  return session;
}

export function requireAdmin(req: VercelRequest, res: VercelResponse) {
  const session = requireSession(req, res);
  if (!session) return null;
  if (session.role !== "admin") {
    json(res, 200, { code: 403, message: "forbidden" });
    return null;
  }
  return session;
}

