"use client";

import { useEffect, useMemo, useState } from "react";
import type { CardEntry, Rarity } from "@/types";
import { generateId } from "@/lib/storage";
import { candidateImageUrls, initialsFromName } from "@/lib/images";

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

  function toggle(name: string, nextOwned: boolean) {
    if (nextOwned) {
      const rarity: Rarity = "Commune"; // défaut pour la case du classeur
      const id = generateId(name, rarity, false);
      onSetOwned({ id, name, rarity, quantity: 1, isFoil: false });
    } else {
      onSetOwned({ id: "", name, rarity: "Commune", quantity: 0 });
    }
  }

  function getQuantityByName(name: string): number {
    return cards.filter((c) => c.name === name).reduce((s, c) => s + c.quantity, 0);
  }

  const [detailName, setDetailName] = useState<string | null>(null);
  const [detailUrls, setDetailUrls] = useState<string[]>([]);
  const [detailQty, setDetailQty] = useState<number>(0);

  function openDetails(name: string) {
    const urls = candidateImageUrls(name);
    setDetailName(name);
    setDetailUrls(urls);
    setDetailQty(getQuantityByName(name));
  }

  function closeDetails() {
    setDetailName(null);
    setDetailUrls([]);
    setDetailQty(0);
  }

  function applyQuantity(name: string, qty: number) {
    const q = Math.max(0, Math.floor(qty));
    if (q <= 0) {
      onSetOwned({ id: "", name, rarity: "Commune", quantity: 0 });
    } else {
      const rarity: Rarity = "Commune";
      const id = generateId(name, rarity, false);
      onSetOwned({ id, name, rarity, quantity: q, isFoil: false });
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
            const urls = candidateImageUrls(n);
            return (
              <CardTile
                key={n}
                name={n}
                imageUrls={urls}
                owned={owned}
                onClick={() => openDetails(n)}
              />
            );
          })
        )}
      </div>
      {detailName && (
        <DetailsModal
          name={detailName}
          urls={detailUrls}
          quantity={detailQty}
          onClose={closeDetails}
          onChangeQuantity={(newQ) => {
            setDetailQty(Math.max(0, Math.floor(newQ)));
            applyQuantity(detailName, newQ);
          }}
        />
      )}
    </section>
  );
}

function CardImage({ name, urls, owned }: { name: string; urls: string[]; owned: boolean }) {
  const [idx, setIdx] = useState(0);
  const [broken, setBroken] = useState(false);
  const current = urls[idx];

  if (!current || broken) {
    const initials = initialsFromName(name);
    return (
      <div
        className={`flex h-full w-full items-center justify-center ${owned ? "bg-amber-500/10" : "bg-zinc-800"}`}
        style={{ filter: owned ? "none" : "grayscale(1) brightness(0.7)" }}
      >
        <span className={`text-2xl font-bold ${owned ? "text-amber-200" : "text-zinc-400"}`}>{initials}</span>
      </div>
    );
  }

  return (
    // Utilise <img> pour éviter la config d’images externes
    <img
      src={current}
      alt={name}
      loading="lazy"
      className="h-full w-full object-cover"
      style={{ filter: owned ? "none" : "grayscale(1) brightness(0.7)" }}
      onError={() => {
        if (idx < urls.length - 1) setIdx(idx + 1);
        else setBroken(true);
      }}
    />
  );
}

function CardTile({
  name,
  imageUrls,
  owned,
  onClick,
}: {
  name: string;
  imageUrls: string[];
  owned: boolean;
  onClick: () => void;
}) {
  const [transform, setTransform] = useState<string>("perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)");

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const midX = rect.width / 2;
    const midY = rect.height / 2;
    const rotateY = ((x - midX) / midX) * 8; // -8..8
    const rotateX = -((y - midY) / midY) * 8; // -8..8
    setTransform(`perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`);
  }

  function handleLeave() {
    setTransform("perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)");
  }

  return (
    <div
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border text-sm transition ${
        owned ? "border-amber-500/40 bg-zinc-900" : "border-zinc-800 bg-zinc-900"
      }`}
      style={{ transform, transition: "transform 120ms ease" }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
    >
      <div className="relative aspect-[3/4] w-full">
        <CardImage name={name} urls={imageUrls} owned={owned} />
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ background: "radial-gradient(600px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.1), transparent 40%)" }}
        />
      </div>
      <div className={`px-2 py-2 ${owned ? "text-amber-100" : "text-zinc-400"}`}>
        <span className="line-clamp-2">{name}</span>
      </div>
    </div>
  );
}

function DetailsModal({
  name,
  urls,
  quantity,
  onClose,
  onChangeQuantity,
}: {
  name: string;
  urls: string[];
  quantity: number;
  onClose: () => void;
  onChangeQuantity: (q: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="runeterra-frame relative grid w-full max-w-3xl grid-cols-1 overflow-hidden bg-zinc-950/90 sm:grid-cols-2" onClick={(e) => e.stopPropagation()}>
        <div className="relative aspect-[3/4] w-full">
          <CardImage name={name} urls={urls} owned={quantity > 0} />
        </div>
        <div className="flex flex-col gap-4 p-4">
          <div className="text-lg font-semibold runeterra-title">{name}</div>
          <div className="text-sm text-zinc-400">Rareté par défaut: Commune</div>
          <div className="mt-2 flex items-center gap-3">
            <button
              className="rounded-md border border-zinc-700/60 px-3 py-2 text-zinc-200 hover:bg-zinc-800"
              onClick={() => onChangeQuantity(quantity - 1)}
            >
              −
            </button>
            <div className="min-w-16 rounded-md border border-zinc-700/60 bg-zinc-900 px-4 py-2 text-center text-zinc-100">
              {quantity}
            </div>
            <button
              className="rounded-md border border-amber-500/60 px-3 py-2 text-amber-200 hover:bg-amber-500/10"
              onClick={() => onChangeQuantity(quantity + 1)}
            >
              +
            </button>
          </div>
          <div className="mt-auto flex justify-end">
            <button className="rounded-md bg-amber-500 px-4 py-2 font-medium text-black hover:bg-amber-400" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


