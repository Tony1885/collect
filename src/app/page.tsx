"use client";

import { useEffect, useMemo, useState } from "react";
import Binder from "@/components/Binder";

export default function Home() {

  const title = useMemo(() => "Riftbound: League of Legends TCG", []);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-zinc-950 to-black">
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-8">
        <header className="flex flex-col items-center gap-2">
          <img src="/logo%20riftbound.png" alt="Riftbound" className="h-16 w-auto" />
          <div className="text-xs font-semibold text-amber-300/90">Origins — Set principal</div>
        </header>

        <Binder />
      </main>
    </div>
  );
}
