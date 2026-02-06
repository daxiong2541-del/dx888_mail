export function parseCookieHeader(cookieHeader: string | undefined) {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) continue;
    const value = rest.join("=");
    result[rawKey] = decodeURIComponent(value ?? "");
  }
  return result;
}

export function serializeCookie(name: string, value: string, options: {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  path?: string;
  maxAge?: number;
} = {}) {
  const segments: string[] = [];
  segments.push(`${name}=${encodeURIComponent(value)}`);
  segments.push(`Path=${options.path ?? "/"}`);
  if (typeof options.maxAge === "number") segments.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) segments.push("HttpOnly");
  if (options.secure) segments.push("Secure");
  if (options.sameSite) segments.push(`SameSite=${options.sameSite}`);
  return segments.join("; ");
}

