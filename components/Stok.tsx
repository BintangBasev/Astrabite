"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "./toast";
import { createClient } from "@/lib/supabase/client";
import { qtyFmt, rp, STATUS_LABEL, stokStatus } from "@/lib/format";
import type { Ingredient } from "@/lib/types";

const KOSONG = { nama: "", satuan: "gr", stok: "", stok_min: "", harga_per_satuan: "", langkah: "100", emoji: "📦" };

export default function Stok({ ings, usage }: { ings: Ingredient[]; usage: Record<string, number> }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState(KOSONG);
  const [open, setOpen] = useState(false);
  const c = { bad: 0, warn: 0, good: 0 };
  ings.forEach((i) => c[stokStatus(i.stok, i.stok_min)]++);

  const adjust = async (i: Ingredient, arah: 1 | -1) => {
    setBusy(i.id);
    const { error } = await createClient().rpc("adjust_stock", { p_ingredient: i.id, p_delta: arah * i.langkah });
    setBusy(null);
    if (error) { toast(error.message); return; }
    toast(`${i.emoji} ${i.nama} ${arah > 0 ? "+" : "−"}${qtyFmt(i.langkah, i.satuan)}`);
    router.refresh();
  };

  const tambah = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await createClient().from("ingredients").insert({
      nama: form.nama.trim(), satuan: form.satuan.trim(), emoji: form.emoji || "📦",
      stok: Number(form.stok) || 0, stok_min: Number(form.stok_min) || 0,
      harga_per_satuan: Number(form.harga_per_satuan) || 0, langkah: Number(form.langkah) || 1,
    });
    if (error) { toast(error.message); return; }
    toast(`Bahan ${form.nama} ditambahin ✅`);
    setForm(KOSONG); setOpen(false);
    router.refresh();
  };
  const set = (k: keyof typeof KOSONG) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="head">
        <div><h1>Fuel Tank</h1><p>Kepotong otomatis tiap ada penjualan. Astro ngitung kapan bahan habis dari pemakaian 7 hari terakhir.</p></div>
        <div className="row wrap">
          <span className="pill bad">{c.bad} kritis</span><span className="pill warn">{c.warn} tipis</span><span className="pill good">{c.good} aman</span>
          <button className="btn sm primary" onClick={() => setOpen(!open)}>+ Bahan baru</button>
        </div>
      </div>

      {open && (
        <form className="card stack" onSubmit={tambah} style={{ marginBottom: 18 }}>
          <h2>Tambah bahan</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,150px),1fr))", gap: 12 }}>
            <div className="field"><label htmlFor="b-nama">Nama</label><input className="input" id="b-nama" required value={form.nama} onChange={set("nama")} placeholder="Bawang merah" /></div>
            <div className="field"><label htmlFor="b-emoji">Emoji</label><input className="input" id="b-emoji" value={form.emoji} onChange={set("emoji")} /></div>
            <div className="field"><label htmlFor="b-sat">Satuan</label><input className="input" id="b-sat" required value={form.satuan} onChange={set("satuan")} placeholder="gr / ml / pcs" /></div>
            <div className="field"><label htmlFor="b-stok">Stok sekarang</label><input className="input num" id="b-stok" inputMode="decimal" value={form.stok} onChange={set("stok")} /></div>
            <div className="field"><label htmlFor="b-min">Stok minimum</label><input className="input num" id="b-min" inputMode="decimal" value={form.stok_min} onChange={set("stok_min")} /></div>
            <div className="field"><label htmlFor="b-harga">Harga per satuan (Rp)</label><input className="input num" id="b-harga" inputMode="decimal" value={form.harga_per_satuan} onChange={set("harga_per_satuan")} /></div>
            <div className="field"><label htmlFor="b-step">Tombol isi (+)</label><input className="input num" id="b-step" inputMode="decimal" value={form.langkah} onChange={set("langkah")} /></div>
          </div>
          <div className="row"><button className="btn primary" type="submit">Simpan bahan</button><button className="btn" type="button" onClick={() => setOpen(false)}>Batal</button></div>
        </form>
      )}

      <div className="fuel">
        {[...ings].sort((a, b) => a.stok / (a.stok_min || 1) - b.stok / (b.stok_min || 1)).map((i) => {
          const st = stokStatus(i.stok, i.stok_min);
          const u = usage[i.id];
          const d = u ? i.stok / u : null;
          const pct = Math.min(100, (i.stok / Math.max(1, i.stok_min * 3)) * 100);
          return (
            <div className="card fcard" key={i.id}>
              <div className="row"><span className="emo">{i.emoji}</span>
                <span className="grow"><b>{i.nama}</b><br /><span className="muted num" style={{ fontSize: 12.5 }}>{rp(i.harga_per_satuan)} / {i.satuan}</span></span>
                <span className={`pill ${st}`}>{STATUS_LABEL[st]}</span></div>
              <div className="row between" style={{ alignItems: "baseline" }}><span className="big num">{qtyFmt(i.stok, i.satuan)}</span><span className="muted num" style={{ fontSize: 13 }}>min {qtyFmt(i.stok_min, i.satuan)}</span></div>
              <div className="bar"><i style={{ width: `${pct}%`, background: `var(--${st === "bad" ? "bad" : st === "warn" ? "sun" : "good"})` }} /></div>
              <p className="muted" style={{ fontSize: 13 }}>
                👨‍🚀 {d === null ? "Belum kepake 7 hari terakhir." : d < 1.5
                  ? <b style={{ color: "var(--bad)" }}>Habis ±{d.toLocaleString("id-ID", { maximumFractionDigits: 1 })} hari lagi, belanja sekarang!</b>
                  : `Cukup buat ±${Math.floor(d)} hari.`}
              </p>
              <div className="row">
                <button className="btn sm" disabled={busy === i.id} onClick={() => adjust(i, -1)} aria-label={`Kurangi stok ${i.nama}`}>− {qtyFmt(i.langkah, i.satuan)}</button>
                <button className="btn sm primary" disabled={busy === i.id} onClick={() => adjust(i, 1)}>+ Isi {qtyFmt(i.langkah, i.satuan)}</button>
              </div>
            </div>
          );
        })}
        {!ings.length && <div className="empty">Belum ada bahan. Tambah bahan dulu biar stok bisa dihitung.</div>}
      </div>
    </>
  );
}
