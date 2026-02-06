import { neon } from "@neondatabase/serverless";

function getDatabaseUrl() {
  const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing POSTGRES_URL/DATABASE_URL");
  }
  return url;
}

export function sql() {
  return neon(getDatabaseUrl());
}

