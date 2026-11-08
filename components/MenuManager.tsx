"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FoodArt from "./FoodArt";
import { toast } from "./toast";
import { createClient } from "@/lib/supabase/client";
import { hpp, saranHarga } from "@/lib/menu-math";
import { jt, qtyFmt, rp } from "@/lib/format";
import type { Ingredient, Menu, Recipe, Warna } from "@/lib/types";

type Draft = {
  id?: string; nama: string; kategori: Menu["kategori"]; harga: string; emoji: string; warna: Warna; panas: boolean; aktif: boolean;
  resep: { ingredient_id: string; qty: string }[];
};
const WARNA: Warna[] = ["pink", "sun", "sky", "lime", "violet"];
const baru = (): Draft => ({ nama: "", kategori: "Makanan", harga: "", emoji: "🍽️", warna: "pink", panas: false, aktif: true, resep: [] });

async function kecilkan(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const k = Math.min(1, 1000 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok) => c.toBlob((b) => ok(b ?? file), "image/jpeg", 0.85));
  } finally { URL.revokeObjectURL(url); }
}

export default function MenuManager({ menus, ings, recipes }: { menus: Menu[]; ings: Ingredient[]; recipes: Recipe[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const ing = (id: string) => ings.find((i) => i.id === id);

  const edit = (m: Menu) => setDraft({
    id: m.id, nama: m.nama, kategori: m.kategori, harga: String(m.harga), emoji: m.emoji, warna: m.warna, panas: m.panas, aktif: m.aktif,
    resep: recipes.filter((r) => r.menu_id === m.id).map((r) => ({ ingredient_id: r.ingredient_id, qty: String(r.qty) })),
  });

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    const sb = createClient();
    const row = { nama: draft.nama.trim(), kategori: draft.kategori, harga: Number(draft.harga) || 0, emoji: draft.emoji || "🍽️", warna: draft.warna, panas: draft.panas, aktif: draft.aktif };
    const res = draft.id ? await sb.from("menus").update(row).eq("id", draft.id).select().single() : await sb.from("menus").insert(row).select().single();
    if (res.error) { setBusy(false); toast(res.error.message); return; }
    const id = res.data.id as string;
    const resep = draft.resep.filter((r) => r.ingredient_id && Number(r.qty) > 0);
    const del = await sb.from("recipes").delete().eq("menu_id", id);
    const ins = resep.length ? await sb.from("recipes").insert(resep.map((r) => ({ menu_id: id, ingredient_id: r.ingredient_id, qty: Number(r.qty) }))) : { error: null };
    setBusy(false);
    if (del.error || ins.error) { toast((del.error || ins.error)!.message); return; }
    toast(`${row.nama} tersimpan ✅`);
    setDraft(null);
    router.refresh();
  };

  const upload = async (m: Menu, file: File | undefined) => {
    if (!file) return;
    const sb = createClient();
    const blob = await kecilkan(file);
    const path = `${m.id}/${Date.now()}.jpg`;
    const up = await sb.storage.from("menu").upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (up.error) { toast(up.error.message); return; }
    const url = sb.storage.from("menu").getPublicUrl(path).data.publicUrl;
    const { error } = await sb.from("menus").update({ foto_url: url }).eq("id", m.id);
    if (error) { toast(error.message); return; }
    toast(`Foto ${m.nama} kepasang 📸`);
    router.refresh();
  };

  const setR = (i: number, k: "ingredient_id" | "qty", v: string) =>
    draft && setDraft({ ...draft, resep: draft.resep.map((r, j) => (j === i ? { ...r, [k]: v } : r)) });

  return (
    <>
      <div className="head">
        <div><h1>Menu & Resep <span className="scribble">fresh!</span></h1><p>Upload foto menu biar tampil di kasir, TV, dan konten promo. HPP dihitung otomatis dari resep.</p></div>
        <button className="btn primary" onClick={() => setDraft(baru())}>+ Menu baru</button>
      </div>

      <div className="menus">
        {menus.map((m) => {
          const h = hpp(m.id, recipes, ings), mg = m.harga ? 1 - h / m.harga : 0;
          const cls = mg < 0.55 ? "bad" : mg < 0.62 ? "warn" : "good";
          const rs = recipes.filter((r) => r.menu_id === m.id);
          return (
            <div className="card stack" key={m.id} style={m.aktif ? undefined : { opacity: 0.6 }}>
              <div className="art-wrap">
                <FoodArt menu={m} size="md" />
                <label className="btn sm photo-btn" htmlFor={`foto-${m.id}`}>📷 {m.foto_url ? "Ganti" : "Upload"} foto</label>
                <input type="file" accept="image/*" id={`foto-${m.id}`} hidden onChange={(e) => upload(m, e.target.files?.[0])} />
              </div>
              <div className="row between">
                <div><h2 style={{ fontSize: 17 }}>{m.nama}</h2><span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{m.kategori}{m.aktif ? "" : " · nonaktif"}</span></div>
                <button className="btn sm" onClick={() => edit(m)}>Edit</button>
              </div>
              <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 8, textAlign: "center" }}>
                <div><p className="eyebrow muted">Harga</p><b className="num">{rp(m.harga)}</b></div>
                <div><p className="eyebrow muted">HPP</p><b className="num">{rp(h)}</b></div>
                <div><p className="eyebrow muted">Margin</p><span className={`pill ${cls} num`}>{Math.round(mg * 100)}%</span></div>
              </div>
              <table className="recipe"><tbody>
                {rs.map((r) => { const i = ing(r.ingredient_id); return i && (
                  <tr key={r.ingredient_id}><td>{i.emoji} {i.nama} <span className="muted num">{qtyFmt(r.qty, i.satuan)}</span></td><td className="num">{rp(r.qty * i.harga_per_satuan)}</td></tr>
                ); })}
                {!rs.length && <tr><td className="muted">Resep belum diisi, jadi stok & HPP belum kehitung.</td><td /></tr>}
              </tbody></table>
              {rs.length > 0 && mg < 0.55 && (
                <div className="tip">💡 <b>Saran Astro:</b> margin tipis nih. Naikin ke <b className="num">{rp(saranHarga(h))}</b> biar margin ±60%.
                  <div style={{ marginTop: 8 }}>
                    <button className="btn sm primary" onClick={async () => {
                      const { error } = await createClient().from("menus").update({ harga: saranHarga(h) }).eq("id", m.id);
                      if (error) toast(error.message); else { toast(`Harga ${m.nama} jadi ${rp(saranHarga(h))} ✅`); router.refresh(); }
                    }}>Pakai harga {jt(saranHarga(h))}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!menus.length && <div className="empty">Belum ada menu. Klik “+ Menu baru”.</div>}
      </div>

      {draft && (
        <div className="modal-wrap" onClick={(e) => e.target === e.currentTarget && setDraft(null)}>
          <form className="card modal stack" onSubmit={simpan} role="dialog" aria-modal="true" aria-label="Edit menu">
            <div className="row between"><h2>{draft.id ? "Edit menu" : "Menu baru"}</h2><button type="button" className="btn sm" onClick={() => setDraft(null)} aria-label="Tutup">✕</button></div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,150px),1fr))", gap: 12 }}>
              <div className="field" style={{ gridColumn: "1/-1" }}><label htmlFor="m-nama">Nama menu</label><input className="input" id="m-nama" required value={draft.nama} onChange={(e) => setDraft({ ...draft, nama: e.target.value })} /></div>
              <div className="field"><label htmlFor="m-harga">Harga (Rp)</label><input className="input num" id="m-harga" inputMode="numeric" required value={draft.harga} onChange={(e) => setDraft({ ...draft, harga: e.target.value.replace(/\D/g, "") })} /></div>
              <div className="field"><label htmlFor="m-kat">Kategori</label>
                <select className="input" id="m-kat" value={draft.kategori} onChange={(e) => setDraft({ ...draft, kategori: e.target.value as Menu["kategori"] })}>
                  <option>Makanan</option><option>Minuman</option><option>Snack</option></select></div>
              <div className="field"><label htmlFor="m-emoji">Emoji</label><input className="input" id="m-emoji" value={draft.emoji} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} /></div>
              <div className="field"><label htmlFor="m-warna">Warna taplak</label>
                <select className="input" id="m-warna" value={draft.warna} onChange={(e) => setDraft({ ...draft, warna: e.target.value as Warna })}>
                  {WARNA.map((w) => <option key={w} value={w}>{w}</option>)}</select></div>
            </div>
            <div className="row wrap" style={{ gap: 16 }}>
              <label className="row" style={{ gap: 6, fontWeight: 600 }}><input type="checkbox" checked={draft.panas} onChange={(e) => setDraft({ ...draft, panas: e.target.checked })} /> Ada asapnya (menu panas)</label>
              <label className="row" style={{ gap: 6, fontWeight: 600 }}><input type="checkbox" checked={draft.aktif} onChange={(e) => setDraft({ ...draft, aktif: e.target.checked })} /> Dijual</label>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              <div className="row between"><b>Resep per porsi</b><button type="button" className="btn sm" onClick={() => setDraft({ ...draft, resep: [...draft.resep, { ingredient_id: "", qty: "" }] })}>+ Bahan</button></div>
              {draft.resep.map((r, i) => (
                <div className="recipe-row" key={i}>
                  <select className="input" aria-label="Bahan" value={r.ingredient_id} onChange={(e) => setR(i, "ingredient_id", e.target.value)}>
                    <option value="">Pilih bahan…</option>
                    {ings.map((x) => <option key={x.id} value={x.id}>{x.emoji} {x.nama} ({x.satuan})</option>)}
                  </select>
                  <input className="input num" aria-label="Jumlah" inputMode="decimal" placeholder="qty" value={r.qty} onChange={(e) => setR(i, "qty", e.target.value)} />
                  <button type="button" className="btn sm" aria-label="Hapus bahan" onClick={() => setDraft({ ...draft, resep: draft.resep.filter((_, j) => j !== i) })}>✕</button>
                </div>
              ))}
              {!draft.resep.length && <p className="muted" style={{ fontSize: 13 }}>Tambahin bahan biar stok kepotong otomatis tiap menu ini kejual.</p>}
            </div>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? "Menyimpan…" : "Simpan menu"}</button>
          </form>
        </div>
      )}
    </>
  );
}
