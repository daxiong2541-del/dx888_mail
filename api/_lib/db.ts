import { neon } from "@neondatabase/serverless";
import { optionalEnv, requireEnv } from "./env";

let sqlInstance: any | null = null;

function databaseUrl(): string {
  return (
    optionalEnv("DATABASE_URL") ??
    optionalEnv("NEON_DATABASE_URL") ??
    requireEnv("POSTGRES_URL")
  );
}

export function sql(): any {
  if (!sqlInstance) {
    sqlInstance = neon(databaseUrl());
  }
  return sqlInstance;
}
