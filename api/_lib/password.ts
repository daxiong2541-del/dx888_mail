import crypto from "node:crypto";

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [algo, saltHex, hashHex] = parts;
  if (algo !== "scrypt") return false;
  const salt = Buffer.from(saltHex, "hex");
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== derived.length) return false;
  return crypto.timingSafeEqual(expected, derived);
}

