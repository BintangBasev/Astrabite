"use client";
import { useEffect, useState } from "react";
import TvPlayer from "./TvPlayer";

/** Halaman yang dibuka di browser TV: layar penuh + jaga layar tetap nyala. */
export default function TvScreen({ token }: { token: string }) {
  const [hint, setHint] = useState(true);
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {});
    const t = setTimeout(() => setHint(false), 6000);
    return () => { clearTimeout(t); lock?.release().catch(() => {}); };
  }, []);
  const full = () => { document.documentElement.requestFullscreen?.().catch(() => {}); setHint(false); };
  return (
    <div className="tv-page" onClick={full}>
      <div className="tv-full-in"><TvPlayer token={token} /></div>
      {hint && <button className="btn sm tv-exit" style={{ opacity: 0.8 }} onClick={full}>⛶ Klik buat layar penuh</button>}
    </div>
  );
}
