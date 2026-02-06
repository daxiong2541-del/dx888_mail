export function sendJson(res: any, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export async function readJson<T>(req: any): Promise<T> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return {} as T;
  }
  return JSON.parse(raw) as T;
}

export function methodNotAllowed(res: any) {
  sendJson(res, 405, { error: "Method not allowed" });
}
