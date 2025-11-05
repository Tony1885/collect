"use client";

import { useEffect, useMemo, useState } from "react";
import type { CardEntry, Rarity } from "@/types";
import { generateId } from "@/lib/storage";
import { candidateImageUrls, initialsFromName } from "@/lib/images";

export interface BinderProps {}

type CardRef = { name: string; number?: string };

function useAllCardRefs(): CardRef[] {
  const [refs, setRefs] = useState<CardRef[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function loadList() {
      try {
        const res = await fetch("/liste.txt", { cache: "force-cache" });
        if (!res.ok) return;
        const text = await res.text();
        const lines = text.split(/\r?\n/);
        const out: CardRef[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const parts = line.split(/\t/);
          if (parts.length < 2) continue;
          const num = parts[0]?.trim();
          const nm = parts[1]?.trim();
          // Filtrer les OGN overnumbered (>298) et les variantes étoilées
          const base = (num ?? "").split("/")[0];
          const hasStar = base.includes("*");
          let isOvernumbered = false;
          if (/^OGN-/i.test(base)) {
            const cleaned = base.replace(/\*$/, "");
            const m = cleaned.match(/^OGN-(\d+)/i);
            const n = m ? parseInt(m[1], 10) : NaN;
            if (!isNaN(n) && n > 298) isOvernumbered = true;
          }
          if (nm && !hasStar && !isOvernumbered) out.push({ name: nm, number: num });
        }
        const seen = new Set<string>();
        const unique = out.filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)));
        if (!cancelled) setRefs(unique);
      } catch {
        // silent
      }
    }
    loadList();
    return () => {
      cancelled = true;
    };
  }, []);
  return refs;
}

export default function Binder({}: BinderProps) {
  const refs = useAllCardRefs();
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [cols, setCols] = useState<number>(4);
  const [statusMap, setStatusMap] = useState<Record<string, { owned: boolean; duplicate: boolean; foil: boolean }>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/cards/index.json", { cache: "no-cache" });
        if (!res.ok) return;
        const data = (await res.json()) as Record<string, string>;
        setImageMap(data || {});
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/collection", { cache: "no-cache" });
        if (!res.ok) return;
        const data = (await res.json()) as Record<string, { owned: boolean; duplicate: boolean; foil: boolean }>;
        setStatusMap(data || {});
      } catch {}
    })();
  }, []);

  const ownedSet = useMemo(() => {
    const s = new Set<string>();
    for (const name in statusMap) if (statusMap[name]?.owned) s.add(name);
    return s;
  }, [statusMap]);

  const numberByName = useMemo(() => {
    const m = new Map<string, string | undefined>();
    for (const r of refs) m.set(r.name, r.number);
    return m;
  }, [refs]);

  function normalizeNumber(num?: string): string | undefined {
    if (!num) return undefined;
    const trimmed = num.trim();
    return trimmed.split("/")[0] || trimmed;
  }

  const filteredRefs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return refs;
    return refs.filter((r) => {
      const nm = r.name.toLowerCase();
      const num = (r.number ?? "").toLowerCase();
      return nm.includes(q) || num.includes(q);
    });
  }, [refs, query]);

  const gridColsClass = useMemo(() => {
    // Table statique pour Tailwind (évite les classes dynamiques non détectées)
    const map: Record<number, string> = {
      4: "md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4",
      5: "md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5",
      6: "md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-6",
      7: "md:grid-cols-7 lg:grid-cols-7 xl:grid-cols-7",
      8: "md:grid-cols-8 lg:grid-cols-8 xl:grid-cols-8",
    };
    return map[Math.min(8, Math.max(4, cols))] ?? map[4];
  }, [cols]);

  // Plus de gestion de quantité côté front; l'état vient du back-office

  function getQuantityByName(_name: string): number {
    return statusMap[_name]?.owned ? 1 : 0;
  }

  const [detailName, setDetailName] = useState<string | null>(null);
  const [detailUrls, setDetailUrls] = useState<string[]>([]);
  const [detailQty, setDetailQty] = useState<number>(0);

  function openDetails(name: string) {
    const num = normalizeNumber(numberByName.get(name));
    const riftmana = num ? `https://riftmana.com/wp-content/uploads/Cards/${num}.webp` : undefined;
    const urls = [riftmana, ...candidateImageUrls(name)].filter(Boolean) as string[];
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
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold runeterra-title">Classeur — toutes les cartes</div>
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-80">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom ou numéro (ex: OGN-001, Jinx)"
              className="w-full rounded-md border border-zinc-700/60 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
            />
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500">⌕</div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400">Cartes/ligne</label>
            <input
              type="range"
              min={4}
              max={8}
              step={1}
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value))}
              className="h-2 w-40 cursor-pointer appearance-none rounded bg-zinc-800"
            />
            <div className="min-w-6 text-right text-xs text-zinc-300">{cols}</div>
          </div>
        </div>
      </div>
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${gridColsClass}`}>
        {refs.length === 0 ? (
          <div className="col-span-full text-zinc-500">Chargement de la liste…</div>
        ) : (
          filteredRefs.map(({ name: n }) => {
            const owned = ownedSet.has(n);
            const num = normalizeNumber(numberByName.get(n));
            const riftmana = num ? `https://riftmana.com/wp-content/uploads/Cards/${num}.webp` : undefined;
            const urls = [imageMap[n], riftmana, ...candidateImageUrls(n)].filter(Boolean) as string[];
            const foil = !!statusMap[n]?.foil;
            const duplicate = !!statusMap[n]?.duplicate;
            return (
              <CardTile key={n} name={n} imageUrls={urls} owned={owned} foil={foil} duplicate={duplicate} onClick={() => openDetails(n)} />
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

function CardImage({ name, urls, owned, foil, duplicate }: { name: string; urls: string[]; owned: boolean; foil?: boolean; duplicate?: boolean }) {
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
    <div className="h-full w-full">
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
      {foil && (
        <div className="pointer-events-none absolute right-1 top-1 text-lg" title="Foil">✨</div>
      )}
      {duplicate && (
        <div className="pointer-events-none absolute left-1 top-1 rounded bg-black/60 px-1 text-xs text-amber-200" title="Double">x2</div>
      )}
    </div>
  );
}

function CardTile({ name, imageUrls, owned, foil, duplicate, onClick }: { name: string; imageUrls: string[]; owned: boolean; foil?: boolean; duplicate?: boolean; onClick: () => void }) {
  const [transform, setTransform] = useState<string>("perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)");

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const midX = rect.width / 2;
    const midY = rect.height / 2;
    const rotateY = ((x - midX) / midX) * 8; // -8..8
    const rotateX = -((y - midY) / midY) * 8; // -8..8
    setTransform(`perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03) translateY(-4px)`);
  }

  function handleLeave() {
    setTransform("perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)");
  }

  return (
    <div
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border text-sm transition ${
        owned ? "border-amber-500/40 bg-zinc-900" : "border-zinc-800 bg-zinc-900"
      }`}
      style={{ transform, transition: "transform 140ms ease, box-shadow 140ms ease" }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
    >
      <div className="relative aspect-[3/4] w-full">
        <CardImage name={name} urls={imageUrls} owned={owned} foil={foil} duplicate={duplicate} />
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


