"use client";

import { useEffect, useMemo, useState } from "react";

type CardRow = { name: string; number?: string; owned: boolean; duplicate: boolean; foil: boolean };

export default function AdminPage() {
  const [refs, setRefs] = useState<{ name: string; number?: string }[]>([]);
  const [map, setMap] = useState<Record<string, CardRow>>({});
  const [q, setQ] = useState("");
  const [dbInfo, setDbInfo] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [listRes, mapRes] = await Promise.all([fetch("/liste.txt", { cache: "force-cache" }), fetch("/api/collection", { cache: "no-cache" })]);
        const text = await listRes.text();
        const lines = text.split(/\r?\n/);
        const out: { name: string; number?: string }[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const parts = line.split(/\t/);
          if (parts.length < 2) continue;
          const number = parts[0]?.trim();
          const name = parts[1]?.trim();
          if (name) out.push({ name, number });
        }
        const m = (await mapRes.json()) as Record<string, CardRow>;
        if (!cancelled) {
          setRefs(out);
          setMap(m || {});
        }
      } catch {}
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function runSync() {
    const res = await fetch("/api/admin/sync", { method: "POST" });
    const data = await res.json();
    // recharger la map après sync
    const mapRes = await fetch("/api/collection", { cache: "no-cache" });
    const m = (await mapRes.json()) as Record<string, CardRow>;
    setMap(m || {});
    alert(`Synchronisé: ${data?.upserts ?? 0} entrées (total DB: ${data?.rowCount ?? "?"})`);
  }

  async function runVerify() {
    try {
      const res = await fetch("/api/admin/verify");
      const data = await res.json();
      if (!res.ok) {
        alert(`Vérification: erreur ${res.status} — ${data?.error ?? "inconnue"}`);
        return;
      }
      alert(`Vérification: list=${data?.counts?.list}, db=${data?.counts?.db}, manquantes=${data?.counts?.missing}. Colonnes manquantes: ${(data?.missingColumns ?? []).join(", ") || "aucune"}`);
    } catch (e) {
      alert(`Vérification: échec (${String(e)})`);
    }
  }

  async function runPing() {
    try {
      const res = await fetch("/api/admin/ping");
      const data = await res.json();
      if (data?.ok) setDbInfo(`DB OK — ${data?.rows} lignes — ${data?.connection ?? ""}`);
      else setDbInfo(`DB erreur: ${data?.error ?? "inconnue"}`);
    } catch {
      setDbInfo("DB erreur: échec ping");
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return refs;
    return refs.filter((r) => r.name.toLowerCase().includes(s) || (r.number ?? "").toLowerCase().includes(s));
  }, [refs, q]);

  async function toggle(row: { name: string; number?: string }, key: "owned" | "duplicate" | "foil", value: boolean) {
    const current = map[row.name] ?? { name: row.name, number: row.number, owned: false, duplicate: false, foil: false };
    const next = { ...current, number: row.number, [key]: value } as CardRow;
    setMap((m) => ({ ...m, [row.name]: next }));
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
          <button className="rounded-md border border-zinc-700/60 px-3 py-2 text-zinc-300 hover:bg-zinc-800" onClick={runVerify}>Vérifier</button>
          <button className="rounded-md border border-amber-500/60 px-3 py-2 text-amber-200 hover:bg-amber-500/10" onClick={runSync}>Synchroniser</button>
          <button className="rounded-md border border-zinc-700/60 px-3 py-2 text-zinc-300 hover:bg-zinc-800" onClick={runPing}>Ping DB</button>
          <form action="/api/admin/logout" method="post">
            <button className="rounded-md border border-zinc-700/60 px-3 py-2 text-zinc-300 hover:bg-zinc-800">Logout</button>
          </form>
        </div>
      </div>
      {dbInfo && <div className="mb-4 text-xs text-zinc-400">{dbInfo}</div>}
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
              const s = map[r.name] ?? { name: r.name, number: r.number, owned: false, duplicate: false, foil: false };
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


