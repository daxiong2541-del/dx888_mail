import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseCookieHeader, serializeCookie } from "./cookies";

const COOKIE_NAME = "dx888_session";

type SessionPayload = {
  v: 1;
  uid: number;
  role: "admin" | "user";
  tid: number | null;
  exp: number;
};

function base64urlEncode(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(input: string) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const s = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(s, "base64");
}

function hmac(data: string) {
  const secret = process.env.DX888_SESSION_SECRET ?? "";
  if (!secret) throw new Error("Missing DX888_SESSION_SECRET");
  return crypto.createHmac("sha256", secret).update(data).digest();
}

export function setSessionCookie(res: VercelResponse, session: { uid: number; role: "admin" | "user"; tid: number | null }) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = Number(process.env.DX888_SESSION_TTL_SECONDS ?? "86400");
  const payload: SessionPayload = { v: 1, uid: session.uid, role: session.role, tid: session.tid, exp: now + ttl };
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const sigB64 = base64urlEncode(hmac(payloadB64));
  const value = `${payloadB64}.${sigB64}`;
  const secure = (process.env.NODE_ENV ?? "").toLowerCase() === "production";
  res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, value, { httpOnly: true, secure, sameSite: "Lax", path: "/", maxAge: ttl }));
}

export function clearSessionCookie(res: VercelResponse) {
  const secure = (process.env.NODE_ENV ?? "").toLowerCase() === "production";
  res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, "", { httpOnly: true, secure, sameSite: "Lax", path: "/", maxAge: 0 }));
}

export function getSession(req: VercelRequest): SessionPayload | null {
  const cookies = parseCookieHeader(req.headers.cookie);
  const value = cookies[COOKIE_NAME];
  if (!value) return null;
  const [payloadB64, sigB64] = value.split(".");
  if (!payloadB64 || !sigB64) return null;
  const expected = base64urlEncode(hmac(payloadB64));
  if (expected.length !== sigB64.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigB64))) return null;
  const payloadRaw = base64urlDecode(payloadB64).toString("utf8");
  const payload = JSON.parse(payloadRaw) as SessionPayload;
  if (!payload || payload.v !== 1) return null;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) return null;
  if (payload.role !== "admin" && payload.role !== "user") return null;
  return payload;
}

