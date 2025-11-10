"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function MusicButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const a = new Audio("/music.mp3");
    a.loop = true;
    a.volume = 0.5; // 50%
    audioRef.current = a;
    return () => {
      try {
        a.pause();
      } catch {}
      audioRef.current = null;
    };
  }, []);

  async function toggle() {
    const a = audioRef.current;
    if (!a) return;
    try {
      if (playing) {
        a.pause();
        setPlaying(false);
      } else {
        await a.play();
        setPlaying(true);
      }
    } catch {
      // silencieux
    }
  }

  // positions de quelques particules autour du bouton
  const particles = useMemo(
    () => [
      { left: "-6px", top: "-6px", delay: "0s" },
      { left: "36px", top: "-10px", delay: "0.2s" },
      { left: "50px", top: "20px", delay: "0.4s" },
      { left: "24px", top: "48px", delay: "0.6s" },
      { left: "-10px", top: "34px", delay: "0.8s" },
    ],
    []
  );

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={toggle}
        className={`relative flex h-14 w-14 items-center justify-center overflow-visible rounded-full bg-zinc-900/90 shadow-lg ring-1 ring-zinc-700/60 transition hover:bg-zinc-800 ${playing ? "shadow-amber-500/30" : ""}`}
        aria-label={playing ? "Mettre en pause" : "Lire la musique"}
      >
        {/* Ondes (actives uniquement en lecture) */}
        {playing && (
          <>
            <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-amber-400/40 animate-ping" />
            <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-amber-500/30 animate-ping" style={{ animationDelay: "0.25s" }} />
            <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-amber-600/20 animate-ping" style={{ animationDelay: "0.5s" }} />
          </>
        )}

        {/* Particules (petits points) */}
        {playing &&
          particles.map((p, i) => (
            <span
              key={i}
              className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-amber-400/70 animate-bounce"
              style={{ left: p.left, top: p.top, animationDelay: p.delay }}
            />
          ))}

        {/* Icône */}
        <img src="/music-orange-icon.png" alt="Musique" className="relative h-7 w-7" />
      </button>
    </div>
  );
}



