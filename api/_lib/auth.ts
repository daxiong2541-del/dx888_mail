import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";
import { requireEnv } from "./env";

export type AuthUser = {
  userId: string;
  role: "admin" | "user";
  tenantId: string | null;
};

function jwtSecret(): Uint8Array {
  return new TextEncoder().encode(requireEnv("JWT_SECRET"));
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function signAuthToken(user: AuthUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(jwtSecret());
}

export async function verifyAuthToken(token: string): Promise<AuthUser> {
  const result = await jwtVerify(token, jwtSecret());
  const payload = result.payload as Partial<AuthUser>;
  if (!payload.userId || !payload.role) {
    throw new Error("Invalid token payload");
  }
  return {
    userId: String(payload.userId),
    role: payload.role as AuthUser["role"],
    tenantId: payload.tenantId ? String(payload.tenantId) : null
  };
}

export function getBearerToken(req: any): string | null {
  const header = req.headers?.authorization ?? req.headers?.Authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export async function requireAuth(req: any): Promise<AuthUser> {
  const token = getBearerToken(req);
  if (!token) {
    throw new Error("Missing Authorization");
  }
  return verifyAuthToken(token);
}

export function randomToken(): string {
  return randomBytes(24).toString("base64url");
}

export function stableHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

