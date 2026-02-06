import type { VercelResponse } from "@vercel/node";

export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data?: T;
};

export function json<T>(res: VercelResponse, status: number, body: ApiEnvelope<T>) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(body));
}

export function notFound(res: VercelResponse) {
  return json(res, 404, { code: 404, message: "Not Found" });
}

export function methodNotAllowed(res: VercelResponse) {
  return json(res, 405, { code: 405, message: "Method Not Allowed" });
}

export function badRequest(res: VercelResponse, message: string) {
  return json(res, 400, { code: 400, message });
}

export function unauthorized(res: VercelResponse) {
  return json(res, 401, { code: 401, message: "Unauthorized" });
}
