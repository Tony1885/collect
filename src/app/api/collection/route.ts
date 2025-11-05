import { NextResponse } from "next/server";
import { ensureSchema, query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  await ensureSchema();
  const { rows } = await query<{ name: string; number: string | null; owned: boolean; duplicate: boolean; foil: boolean }>(
    "select name, number, owned, duplicate, foil from collection order by name asc"
  );
  const mapping: Record<string, { number?: string; owned: boolean; duplicate: boolean; foil: boolean }> = {};
  for (const r of rows) mapping[r.name] = { number: r.number ?? undefined, owned: r.owned, duplicate: r.duplicate, foil: r.foil };
  return NextResponse.json(mapping, { status: 200 });
}

export async function PATCH(req: Request) {
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const { name, number, owned, duplicate, foil } = body as {
    name?: string;
    number?: string;
    owned?: boolean;
    duplicate?: boolean;
    foil?: boolean;
  };
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name requis" }, { status: 400 });
  }
  const fields: string[] = [];
  const values: any[] = [];
  if (typeof number === "string") {
    fields.push("number");
    values.push(number);
  }
  if (typeof owned === "boolean") {
    fields.push("owned");
    values.push(owned);
  }
  if (typeof duplicate === "boolean") {
    fields.push("duplicate");
    values.push(duplicate);
  }
  if (typeof foil === "boolean") {
    fields.push("foil");
    values.push(foil);
  }

  // upsert
  const existing = await query("select 1 from collection where name=$1", [name]);
  if (existing.rows.length === 0) {
    await query("insert into collection(name, number, owned, duplicate, foil) values($1,$2,$3,$4,$5)", [
      name,
      number ?? null,
      owned ?? false,
      duplicate ?? false,
      foil ?? false,
    ]);
  } else if (fields.length > 0) {
    const sets = fields.map((f, i) => `${f}=$${i + 2}`).join(", ");
    await query(`update collection set ${sets}, updated_at=now() where name=$1`, [name, ...values]);
  }
  return NextResponse.json({ ok: true });
}


