"use client";
import { useState } from "react";
import Link from "next/link";

export default function DailyLog({ awal, fallback }: { awal: string | null; fallback: string[] }) {
  const [isi, setIsi] = useState(awal);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const buat = async () => {
    setBusy(true); setErr("");
    const r = await fetch("/api/ai/daily", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? "Gagal bikin ringkasan"); return; }
    setIsi(j.isi);
  };
  const poin = isi ? isi.split("\n").map((l) => l.replace(/^[-•]\s*/, "").trim()).filter(Boolean) : fallback;
  return (
    <div className="card log pop-violet">
      <div className="row" style={{ marginBottom: 10 }}>
        <svg style={{ width: 40, height: 40 }}><use href="#astro" /></svg>
        <div>
          <h2 style={{ color: "#fff" }}>Daily Log dari Astro</h2>
          <span style={{ fontSize: 12, opacity: 0.85 }}>{isi ? "Ringkasan AI hari ini" : "Ringkasan otomatis · klik buat versi AI"}</span>
        </div>
      </div>
      <ul>{poin.map((p, i) => <li key={i}>{p}</li>)}</ul>
      {err && <p className="err" style={{ marginTop: 10 }}>{err}</p>}
      <div className="row wrap" style={{ marginTop: 14 }}>
        <button className="btn sm" onClick={buat} disabled={busy}>{busy ? "Astro lagi mikir…" : isi ? "↻ Perbarui" : "✦ Bikin pakai AI"}</button>
        <Link className="btn sm" href="/astro">Tanya Astro →</Link>
      </div>
    </div>
  );
}
