"use client";

import { useEffect, useMemo, useState } from "react";
 
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
          if (nm) out.push({ name: nm, number: num });
        }
        // Garder toutes les entrées, y compris les overnumbered après 298
        if (!cancelled) setRefs(out);
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

  // Plus de map par nom: on utilise le numéro de chaque entrée telle que listée

  function normalizeNumber(num?: string): string | undefined {
    if (!num) return undefined;
    const trimmed = num.trim();
    const base = trimmed.split("/")[0] || trimmed;
    return base.replace(/\*/g, "");
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

  function openDetails(name: string, rawNum?: string) {
    const num = normalizeNumber(rawNum);
    const riftmana = num ? `https://riftmana.com/wp-content/uploads/Cards/${num}.webp` : undefined;
    const urls = [riftmana, ...candidateImageUrls(name)].filter(Boolean) as string[];
    setDetailName(name);
    setDetailUrls(urls);
  }

  function closeDetails() {
    setDetailName(null);
    setDetailUrls([]);
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
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${gridColsClass}`}>
        {refs.length === 0 ? (
          <div className="col-span-full text-zinc-500">Chargement de la liste…</div>
        ) : (
          filteredRefs.map(({ name: n, number: raw }) => {
            const owned = ownedSet.has(n);
            const num = normalizeNumber(raw);
            const riftmana = num ? `https://riftmana.com/wp-content/uploads/Cards/${num}.webp` : undefined;
            const urls = [imageMap[n], riftmana, ...candidateImageUrls(n)].filter(Boolean) as string[];
            const foil = !!statusMap[n]?.foil;
            const duplicate = !!statusMap[n]?.duplicate;
            const displayNum = raw ? (raw.split("-")[1] || raw) : "";
            return (
              <CardTile key={`${n}-${num ?? ""}`} name={n} imageUrls={urls} owned={owned} foil={foil} duplicate={duplicate} numberText={displayNum} onClick={() => openDetails(n, raw)} />
            );
          })
        )}
      </div>
      {detailName && (
        <DetailsModal name={detailName} urls={detailUrls} owned={ownedSet.has(detailName)} onClose={closeDetails} foil={!!statusMap[detailName]?.foil} duplicate={!!statusMap[detailName]?.duplicate} />
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

function CardTile({ name, imageUrls, owned, foil, duplicate, numberText, onClick }: { name: string; imageUrls: string[]; owned: boolean; foil?: boolean; duplicate?: boolean; numberText?: string; onClick: () => void }) {
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
      <div className={`px-2 py-2 ${owned ? "text-amber-100" : "text-zinc-400"} flex items-center justify-between`}>
        <span className="line-clamp-2">{name}</span>
        {numberText && <span className="ml-2 shrink-0 text-xs text-zinc-500">{numberText}</span>}
      </div>
    </div>
  );
}

function DetailsModal({ name, urls, owned, foil, duplicate, onClose }: { name: string; urls: string[]; owned: boolean; foil?: boolean; duplicate?: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
          <CardImage name={name} urls={urls} owned={owned} foil={foil} duplicate={duplicate} />
        </div>
      </div>
    </div>
  );
}


