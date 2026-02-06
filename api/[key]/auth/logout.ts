import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApiKey } from "../../_lib/auth";
import { clearSessionCookie } from "../../_lib/session";
import { json, methodNotAllowed } from "../../_lib/response";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  if (!requireApiKey(req, res)) return;
  clearSessionCookie(res);
  return json(res, 200, { code: 200, message: "success" });
}

