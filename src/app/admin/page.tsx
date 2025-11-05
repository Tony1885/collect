"use client";

import { useEffect, useMemo, useState } from "react";

type CardRow = { name: string; number?: string; owned: boolean; duplicate: boolean; foil: boolean };

export default function AdminPage() {
  const [rows, setRows] = useState<CardRow[]>([]);
  const [map, setMap] = useState<Record<string, CardRow>>({});
  const [q, setQ] = useState("");
  function keyFor(r: { name: string; number?: string }) { return `${r.name}|||${r.number ?? ''}`; }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/collection/rows", { cache: "no-cache" });
        if (!res.ok) return;
        const data = (await res.json()) as CardRow[];
        if (!cancelled) {
          setRows(data);
          const m: Record<string, CardRow> = {};
          for (const r of data) m[keyFor(r)] = r;
          setMap(m);
        }
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // plus de boutons techniques; tout est auto-enregistré

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(s) || (r.number ?? "").toLowerCase().includes(s));
  }, [rows, q]);

  async function toggle(row: { name: string; number?: string }, key: "owned" | "duplicate" | "foil", value: boolean) {
    const k = keyFor(row);
    const current = map[k] ?? { name: row.name, number: row.number, owned: false, duplicate: false, foil: false };
    const next = { ...current, number: row.number, [key]: value } as CardRow;
    setMap((m) => ({ ...m, [k]: next }));
    await fetch("/api/collection", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: row.name, number: row.number, [key]: value }),
    });
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h1 className="runeterra-title text-lg font-semibold text-amber-200">Admin — Collection</h1>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (nom/numéro)"
            className="w-64 rounded-md border border-zinc-700/60 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
          <a href="/" className="rounded-md border border-zinc-700/60 px-3 py-2 text-zinc-300 hover:bg-zinc-800" aria-label="Accueil">
            🏠 Home
          </a>
          <form action="/api/admin/logout" method="post">
            <button className="rounded-md border border-zinc-700/60 px-3 py-2 text-zinc-300 hover:bg-zinc-800">Logout</button>
          </form>
        </div>
      </div>
      <div className="mb-4 text-xs text-zinc-400">Les modifications sont enregistrées automatiquement.</div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-800/60 text-zinc-400">
              <th className="px-3 py-2 text-left">Numéro</th>
              <th className="px-3 py-2 text-left">Nom</th>
              <th className="px-3 py-2">Possédé</th>
              <th className="px-3 py-2">Double</th>
              <th className="px-3 py-2">Foil</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const s = map[keyFor(r)] ?? { name: r.name, number: r.number, owned: false, duplicate: false, foil: false };
              return (
                <tr key={r.name} className="border-b border-zinc-900/40 text-zinc-100">
                  <td className="px-3 py-2 text-zinc-400">{r.number?.split("/")[0] ?? ""}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={!!s.owned} onChange={(e) => toggle(r, "owned", e.target.checked)} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={!!s.duplicate} onChange={(e) => toggle(r, "duplicate", e.target.checked)} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={!!s.foil} onChange={(e) => toggle(r, "foil", e.target.checked)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


