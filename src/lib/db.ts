import { Pool } from "pg";

declare global {
  var __workersPgPool: Pool | undefined;
}

let schemaReady = false;

function resolveDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.NEON_DATABASE_URL?.trim() ||
    ""
  );
}

export function isDbConfigured() {
  return Boolean(resolveDatabaseUrl());
}

export async function ensureSchema() {
  if (!isDbConfigured()) return;
  const pool = getPool();
  if (schemaReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT,
      phone TEXT,
      role TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      profile JSONB NOT NULL DEFAULT '{}'::jsonb
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      worker_id TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    );
  `);

  schemaReady = true;
}

function getPool(): Pool {
  if (global.__workersPgPool) return global.__workersPgPool;

  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    throw new Error(
      "Database connection is missing. Set DATABASE_URL (or POSTGRES_URL / POSTGRES_URL_NON_POOLING)."
    );
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });
  global.__workersPgPool = pool;
  return pool;
}

export { getPool };
