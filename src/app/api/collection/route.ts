import { NextResponse } from "next/server";
import { ensureSchema, query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await query<{ name: string; number: string | null; owned: boolean; duplicate: boolean; foil: boolean }>(
      "select name, number, owned, duplicate, foil from collection order by name asc, number asc"
    );
    const mapping: Record<string, { owned: boolean; duplicate: boolean; foil: boolean }> = {};
    for (const r of rows) {
      const key = `${r.name}|||${r.number ?? ''}`;
      mapping[key] = { owned: r.owned, duplicate: r.duplicate, foil: r.foil };
    }
    return NextResponse.json(mapping, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
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

    await query(
      `insert into collection(name, number, owned, duplicate, foil) values($1,$2,$3,$4,$5)
       on conflict (name, number) do update set
         owned=excluded.owned,
         duplicate=excluded.duplicate,
         foil=excluded.foil,
         updated_at=now()`,
      [name, number ?? null, owned ?? false, duplicate ?? false, foil ?? false]
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}


