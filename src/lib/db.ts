import { cookies } from "next/headers";
import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";
    if (!connectionString) {
      throw new Error("DATABASE_URL_UNPOOLED/DATABASE_URL non définies (voir variables d'environnement)");
    }
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
  -- tenter de migrer la clé primaire vers (name, number)
  do $$
  declare
    pk_name text;
    col_count int;
  begin
    select tc.constraint_name into pk_name
    from information_schema.table_constraints tc
    where tc.table_schema='public' and tc.table_name='collection' and tc.constraint_type='PRIMARY KEY'
    limit 1;

    if pk_name is null then
      begin
        execute 'alter table public.collection add primary key (name, number)';
      exception when others then
        -- ignore errors if already set by race
        null;
      end;
    else
      select count(*) into col_count
      from information_schema.key_column_usage k
      where k.table_schema='public' and k.table_name='collection' and k.constraint_name=pk_name;
      if col_count = 1 then
        begin
          execute 'alter table public.collection drop constraint ' || pk_name;
        exception when others then null; end;
        begin
          execute 'alter table public.collection add primary key (name, number)';
        exception when others then null; end;
      end if;
    end if;
  end $$;
  `;
  await getPool().query(sql);
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const p = getPool();
  const res = await p.query(text as any, params as any);
  return { rows: res.rows as T[] };
}


