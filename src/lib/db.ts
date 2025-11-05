import { cookies } from "next/headers";
import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";
    pool = new Pool({ connectionString, max: 1 });
  }
  return pool;
}

export async function ensureSchema(): Promise<void> {
  const sql = `
  create table if not exists collection (
    name text primary key,
    number text,
    owned boolean not null default false,
    duplicate boolean not null default false,
    foil boolean not null default false,
    updated_at timestamptz not null default now()
  );
  `;
  await getPool().query(sql);
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const p = getPool();
  return await p.query(text, params);
}


