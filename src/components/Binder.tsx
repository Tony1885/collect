"use client";

import { useEffect, useMemo, useState } from "react";
import type { CardEntry, Rarity } from "@/types";
import { generateId } from "@/lib/storage";

export interface BinderProps {
  cards: CardEntry[];
  onSetOwned: (entry: CardEntry | null) => void; // null => remove
}

function useAllCardNames(): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function loadList() {
      try {
        const res = await fetch("/liste.txt", { cache: "force-cache" });
        if (!res.ok) return;
        const text = await res.text();
        const lines = text.split(/\r?\n/);
        const out: string[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const parts = line.split(/\t/);
          if (parts.length < 2) continue;
          const nm = parts[1].trim();
          if (nm) out.push(nm);
        }
        const unique = Array.from(new Set(out));
        if (!cancelled) setNames(unique);
      } catch {
        // silent
      }
    }
    loadList();
    return () => {
      cancelled = true;
    };
  }, []);
  return names;
}

export default function Binder({ cards, onSetOwned }: BinderProps) {
  const names = useAllCardNames();

  const ownedSet = useMemo(() => {
    const s = new Set<string>();
    for (const c of cards) {
      if (c.quantity > 0) s.add(c.name);
    }
    return s;
  }, [cards]);

  function toggle(name: string, checked: boolean) {
    if (checked) {
      const rarity: Rarity = "Commune"; // défaut pour la case du classeur
      const id = generateId(name, rarity, false);
      onSetOwned({ id, name, rarity, quantity: 1, isFoil: false });
    } else {
      onSetOwned({ id: "", name, rarity: "Commune", quantity: 0 });
    }
  }

  return (
    <section className="runeterra-frame p-4">
      <div className="mb-3 text-sm font-semibold runeterra-title">Classeur — toutes les cartes</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {names.length === 0 ? (
          <div className="col-span-full text-zinc-500">Chargement de la liste…</div>
        ) : (
          names.map((n) => {
            const owned = ownedSet.has(n);
            return (
              <label
                key={n}
                className={`group flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  owned
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400"
                }`}
                style={{ filter: owned ? "none" : "grayscale(1) brightness(0.8)" }}
              >
                <input
                  type="checkbox"
                  className="accent-amber-500"
                  checked={owned}
                  onChange={(e) => toggle(n, e.target.checked)}
                />
                <span className="line-clamp-2">{n}</span>
              </label>
            );
          })
        )}
      </div>
    </section>
  );
}


