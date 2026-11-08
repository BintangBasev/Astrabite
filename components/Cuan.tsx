"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "./toast";
import { confetti } from "@/lib/confetti";
import { createClient } from "@/lib/supabase/client";
import { jamWib, rp } from "@/lib/format";
import type { Expense, Ingredient } from "@/lib/types";

type Baris = { teks: string; harga: number; ingredient_id: string | null; qty_stok: number | null };
type Hasil = { toko: string | null; total: number; items: Baris[]; nota_path: string };

export default function Cuan({ ings, expenses, omzet, modal, keluar }: { ings: Ingredient[]; expenses: Expense[]; omzet: number; modal: number; keluar: number }) {
  const router = useRouter();
  const [fase, setFase] = useState<"idle" | "scan" | "hasil">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ kat: "Bahan baku", nom: "", ket: "" });

  const scan = async (file: File | undefined) => {
    if (!file) return;
    setErr(""); setPreview(URL.createObjectURL(file)); setFase("scan");
    const fd = new FormData();
    fd.append("nota", file);
    const r = await fetch("/api/ai/scan-nota", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({ error: "Respons server tidak valid" }));
    if (!r.ok) { setErr(j.error ?? "Gagal membaca nota"); setFase("idle"); return; }
    setHasil(j); setFase("hasil");
  };

  const setItem = (i: number, patch: Partial<Baris>) => hasil && setHasil({ ...hasil, items: hasil.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const total = hasil ? hasil.items.reduce((s, x) => s + (Number(x.harga) || 0), 0) : 0;

  const simpanScan = async () => {
    if (!hasil) return;
    setBusy(true);
    const { error } = await createClient().rpc("add_purchase", {
      p_items: hasil.items.filter((x) => x.ingredient_id && x.qty_stok).map((x) => ({ ingredient_id: x.ingredient_id, qty: x.qty_stok })),
      p_nominal: hasil.total || total,
      p_keterangan: `Belanja ${hasil.toko ?? "bahan"} (${hasil.items.length} item)`,
      p_nota_path: hasil.nota_path,
      p_via_scan: true,
    });
    setBusy(false);
    if (error) { toast(error.message); return; }
    confetti(); toast("Nota tersimpan, stok keisi ✅");
    setHasil(null); setFase("idle"); setPreview(null);
    router.refresh();
  };

  const manual = async (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = parseInt(f.nom.replace(/\D/g, ""), 10);
    if (!nominal) { toast("Nominal harus angka, contoh 25000"); return; }
    const { error } = await createClient().from("expenses").insert({ kategori: f.kat, keterangan: f.ket.trim(), nominal });
    if (error) { toast(error.message); return; }
    toast(`Pengeluaran ${rp(nominal)} tercatat 📝`);
    setF({ ...f, nom: "", ket: "" });
    router.refresh();
  };

  return (
    <>
      <div className="head"><div><h1>Cuan Tracker</h1><p>Foto nota belanja, Astro yang ngetik. Stok bahan ikut keisi.</p></div></div>
      <div className="cuan">
        <div className="stack">
          <div className="card stack">
            <div className="row between"><h2>Astro Scan</h2><span className="pill" style={{ background: "var(--violet-t)", color: "var(--violet)" }}>✦ AI</span></div>
            {err && <div className="err">{err}</div>}
            {fase === "idle" && (
              <label className="drop" htmlFor="nota-file">
                <span className="drop-ic"><svg className="ic"><use href="#i-camera" /></svg></span>
                <b>Foto atau upload nota belanja</b>
                <span className="muted" style={{ fontSize: 13 }}>JPG/PNG maks 5 MB. Astro baca isinya, lalu masukin ke pengeluaran & stok</span>
                <input type="file" id="nota-file" accept="image/*" capture="environment" onChange={(e) => scan(e.target.files?.[0])} />
              </label>
            )}
            {fase === "scan" && (
              <>
                <div className="scanbox">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {preview && <img src={preview} alt="Nota yang diupload" />}
                  <div className="scanline" />
                </div>
                <p style={{ textAlign: "center", fontWeight: 800 }}>👨‍🚀 Astro lagi baca nota lo<span className="typing"> <span /><span /><span /></span></p>
              </>
            )}
            {fase === "hasil" && hasil && (
              <>
                <div className="tip">✅ <b>Kebaca {hasil.items.length} item</b>{hasil.toko ? ` dari ${hasil.toko}` : ""}. Cek & koreksi dulu sebelum disimpan.</div>
                <div className="scroll-x">
                  <table className="tbl">
                    <thead><tr><th>Item di nota</th><th>Masuk ke stok</th><th>Jumlah</th><th className="r">Harga</th></tr></thead>
                    <tbody>
                      {hasil.items.map((x, i) => {
                        const ing = ings.find((g) => g.id === x.ingredient_id);
                        return (
                          <tr key={i}>
                            <td>{x.teks}</td>
                            <td><select className="input" style={{ padding: "6px 8px", minWidth: 140 }} aria-label="Bahan" value={x.ingredient_id ?? ""}
                              onChange={(e) => setItem(i, { ingredient_id: e.target.value || null })}>
                              <option value="">Bukan stok</option>
                              {ings.map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.nama}</option>)}
                            </select></td>
                            <td><span className="row" style={{ gap: 4 }}><input className="input num" style={{ padding: "6px 8px", width: 80 }} aria-label="Jumlah" inputMode="decimal"
                              value={x.qty_stok ?? ""} onChange={(e) => setItem(i, { qty_stok: e.target.value === "" ? null : Number(e.target.value) })} disabled={!x.ingredient_id} />
                              <span className="muted" style={{ fontSize: 12 }}>{ing?.satuan}</span></span></td>
                            <td className="r num">{rp(x.harga)}</td>
                          </tr>
                        );
                      })}
                      <tr><td colSpan={3}><b>Total nota</b></td><td className="r num"><b>{rp(hasil.total || total)}</b></td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="row">
                  <button className="btn primary grow" onClick={simpanScan} disabled={busy}>{busy ? "Menyimpan…" : "💾 Simpan ke pengeluaran & stok"}</button>
                  <button className="btn" onClick={() => { setHasil(null); setFase("idle"); setPreview(null); }}>Batal</button>
                </div>
              </>
            )}
          </div>
          <div className="card pop-lime">
            <h2 style={{ marginBottom: 12 }}>Cashflow hari ini</h2>
            <div className="flow num">
              <span>Omzet</span><b>{rp(omzet)}</b>
              <span>HPP bahan terpakai</span><b>− {rp(modal)}</b>
              <span>Pengeluaran operasional</span><b>− {rp(keluar)}</b>
              <span className="tot">Untung bersih</span><span className="tot">{rp(omzet - modal - keluar)}</span>
            </div>
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <div className="row between" style={{ marginBottom: 8 }}><h2>Pengeluaran hari ini</h2><b className="num">{rp(keluar)}</b></div>
            <div className="list">
              {expenses.map((e) => (
                <div key={e.id}>
                  <span className="rank num" style={{ width: "auto", padding: "0 8px", fontSize: 12, fontFamily: "var(--f-mono)", fontWeight: 500 }}>{jamWib(e.created_at)}</span>
                  <span className="grow"><b className="ellip" style={{ display: "block" }}>{e.keterangan}</b><span className="muted" style={{ fontSize: 12.5 }}>{e.kategori}{e.via_scan ? " · via Astro Scan 📸" : ""}</span></span>
                  <b className="num">{rp(e.nominal)}</b>
                </div>
              ))}
              {!expenses.length && <div className="empty">Belum ada pengeluaran hari ini.</div>}
            </div>
          </div>
          <form className="card stack" onSubmit={manual}>
            <h2>Catat manual</h2>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
              <div className="field"><label htmlFor="exp-kat">Kategori</label>
                <select className="input" id="exp-kat" value={f.kat} onChange={(e) => setF({ ...f, kat: e.target.value })}>
                  <option>Bahan baku</option><option>Operasional</option><option>Kemasan</option><option>Gaji</option><option>Lainnya</option></select></div>
              <div className="field"><label htmlFor="exp-nom">Nominal (Rp)</label><input className="input num" id="exp-nom" inputMode="numeric" placeholder="25000" required value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} /></div>
            </div>
            <div className="field"><label htmlFor="exp-ket">Keterangan</label><input className="input" id="exp-ket" placeholder="Es batu 2 karung" required value={f.ket} onChange={(e) => setF({ ...f, ket: e.target.value })} /></div>
            <button className="btn pink" type="submit">+ Tambah pengeluaran</button>
          </form>
        </div>
      </div>
    </>
  );
}
