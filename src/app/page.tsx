"use client";

import { useEffect, useMemo, useState } from "react";
import type { CardEntry } from "@/types";
import { loadCollection, saveCollection } from "@/lib/storage";
// Formulaire retiré sur demande; la gestion passe par le classeur
// Tableau et import retirés
import Binder from "@/components/Binder";

export default function Home() {
  const [cards, setCards] = useState<CardEntry[]>([]);

  useEffect(() => {
    setCards(loadCollection());
  }, []);

  useEffect(() => {
    saveCollection(cards);
  }, [cards]);

  // Ajout via classeur uniquement

  function update(entry: CardEntry) {
    setCards((prev) => prev.map((c) => (c.id === entry.id ? entry : c)));
  }

  function remove(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  function mergeImported(entries: CardEntry[]) {
    setCards((prev) => {
      const map = new Map(prev.map((c) => [c.id, c] as const));
      for (const e of entries) {
        const ex = map.get(e.id);
        if (ex) {
          map.set(e.id, { ...ex, quantity: ex.quantity + e.quantity });
        } else {
          map.set(e.id, e);
        }
      }
      return Array.from(map.values());
    });
  }

  function setOwnedFromBinder(entry: CardEntry | null) {
    if (!entry) return;
    if (entry.quantity <= 0) {
      // retrait par nom (peut exister avec d'autres raretés) => on met quantité 0 pour les correspondances exactes si présentes
      setCards((prev) => prev.filter((c) => c.name !== entry.name));
      return;
    }
    setCards((prev) => {
      const existing = prev.find((c) => c.id === entry.id);
      if (!existing) return [...prev, entry];
      return prev.map((c) => (c.id === entry.id ? { ...c, quantity: entry.quantity } : c));
    });
  }

  const title = useMemo(() => "Riftbound: League of Legends TCG", []);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-zinc-950 to-black">
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-8">
        <header className="flex items-center justify-between">
          <h1 className="bg-gradient-to-r from-amber-300 to-yellow-600 bg-clip-text text-2xl font-extrabold uppercase tracking-wide text-transparent drop-shadow-[0_0_10px_rgba(255,200,50,0.25)]">
            {title}
          </h1>
        </header>

        <Binder cards={cards} onSetOwned={setOwnedFromBinder} />
      </main>
    </div>
  );
}
