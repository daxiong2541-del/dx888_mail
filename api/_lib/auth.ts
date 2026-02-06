import type { VercelRequest, VercelResponse } from "@vercel/node";
import { notFound, unauthorized } from "./response";

export function requireApiKey(req: VercelRequest, res: VercelResponse) {
  const currentKey = process.env.DX888_API_KEY ?? "";
  const key = req.query.key;
  if (!currentKey || typeof key !== "string" || key !== currentKey) {
    notFound(res);
    return null;
  }
  return key;
}

export function requireAuthToken(req: VercelRequest, res: VercelResponse) {
  const requiredToken = process.env.DX888_AUTH_TOKEN ?? "";
  if (!requiredToken) {
    return true;
  }
  const token = req.headers.authorization ?? "";
  if (token !== requiredToken) {
    unauthorized(res);
    return false;
  }
  return true;
}

