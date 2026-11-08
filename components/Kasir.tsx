"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import FoodArt, { Thumb } from "./FoodArt";
import { toast } from "./toast";
import { confetti } from "@/lib/confetti";
import { createClient } from "@/lib/supabase/client";
import { hargaJual, porsiBisa } from "@/lib/menu-math";
import { jamWib, jt, rp } from "@/lib/format";
import type { Ingredient, Menu, Order, OrderItem, Promo, Recipe, Settings } from "@/lib/types";

type Props = {
  menus: Menu[]; ings: Ingredient[]; recipes: Recipe[]; promos: Promo[]; settings: Settings;
  topId: string | null; antrian: (Order & { order_items: OrderItem[] })[];
};
const KATS = ["Semua", "Makanan", "Minuman", "Snack"] as const;
const BAYAR = { QRIS: "📱", Cash: "💵", Transfer: "🏦" } as const;

export default function Kasir({ menus, ings, recipes, promos, settings, topId, antrian }: Props) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [kat, setKat] = useState<(typeof KATS)[number]>("Semua");
  const [pay, setPay] = useState<keyof typeof BAYAR>("QRIS");
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [struk, setStruk] = useState<{ nomor: number; jam: string; items: { m: Menu; q: number; h: number }[]; total: number; bayar: string } | null>(null);

  const aktif = menus.filter((m) => m.aktif);
  const list = aktif.filter((m) => kat === "Semua" || m.kategori === kat);
  const promoOf = (id: string) => promos.find((p) => p.menu_id === id && p.aktif);
  const items = Object.entries(cart).filter(([, q]) => q > 0).map(([id, q]) => ({ m: menus.find((x) => x.id === id)!, q }));
  const total = items.reduce((s, x) => s + x.q * hargaJual(x.m, promos), 0);
  const count = items.reduce((s, x) => s + x.q, 0);

  // Sisa porsi dihitung dari stok dikurangi isi keranjang (bahan bisa dipakai bareng beberapa menu).
  const sisa = useMemo(() => {
    const pakai: Record<string, number> = {};
    for (const [id, q] of Object.entries(cart))
      for (const r of recipes.filter((x) => x.menu_id === id)) pakai[r.ingredient_id] = (pakai[r.ingredient_id] ?? 0) + r.qty * q;
    const left = ings.map((i) => ({ ...i, stok: i.stok - (pakai[i.id] ?? 0) }));
    return (id: string) => porsiBisa(id, recipes, left);
  }, [cart, ings, recipes]);

  const add = (m: Menu) => {
    if (sisa(m.id) <= 0) { toast(`Bahan ${m.nama} habis 😭`); return; }
    setCart((c) => ({ ...c, [m.id]: (c[m.id] ?? 0) + 1 }));
    try { navigator.vibrate?.(12); } catch {}
  };
  const dec = (id: string) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) }));

  const checkout = async () => {
    if (!items.length || busy) return;
    setBusy(true);
    const { data, error } = await createClient().rpc("create_order", {
      p_items: items.map((x) => ({ menu_id: x.m.id, qty: x.q })),
      p_metode: pay,
    });
    setBusy(false);
    if (error) { toast(error.message); return; }
    const o = data as Order;
    setStruk({ nomor: o.nomor, jam: jamWib(o.created_at), items: items.map((x) => ({ ...x, h: hargaJual(x.m, promos) })), total: o.total, bayar: pay });
    setCart({}); setSheet(false);
    confetti();
    toast(`Cuan masuk! 💸 ${rp(o.total)}`);
    router.refresh();
  };

  const setStatus = async (id: string, status: Order["status"]) => {
    const { error } = await createClient().from("orders").update({ status }).eq("id", id);
    if (error) { toast(error.message); return; }
    toast(status === "siap" ? "Pesanan siap, muncul di layar TV 📺" : "Pesanan selesai ✅");
    router.refresh();
  };

  const strukText = struk
    ? `${settings.nama_toko.toUpperCase()}\nPesanan #${struk.nomor} · ${struk.jam}\n----------------------\n` +
      struk.items.map((x) => `${x.m.nama} x${x.q}  ${rp(x.q * x.h)}`).join("\n") +
      `\n----------------------\nTOTAL ${rp(struk.total)} (${struk.bayar})\nMakasih udah mampir! 🚀`
    : "";

  return (
    <>
      <div className="head">
        <div>
          <h1>Launchpad <span className="scribble">gas order!</span></h1>
          <p>Tap menu, bayar, beres. Stok kepotong otomatis.</p>
          {promos.some((p) => p.aktif) && (
            <p style={{ marginTop: 10 }}>
              <span className="pill" style={{ background: "var(--pink-t)", color: "var(--pink)" }}>
                🎟️ Promo aktif: {promos.filter((p) => p.aktif).map((p) => `${menus.find((m) => m.id === p.menu_id)?.nama.split(" ")[0]} −${p.diskon}%`).join(", ")}
              </span>
            </p>
          )}
        </div>
        <div className="row wrap">
          {KATS.map((k) => <button key={k} className={`chip ${kat === k ? "on" : ""}`} onClick={() => setKat(k)}>{k}</button>)}
        </div>
      </div>

      <div className="pos">
        <div className="stack">
          <div className="menu-grid">
            {list.map((m) => {
              const s = sisa(m.id), p = promoOf(m.id), h = hargaJual(m, promos);
              return (
                <button key={m.id} className="card mcard" onClick={() => add(m)} disabled={s <= 0} aria-label={`Tambah ${m.nama}`}>
                  {cart[m.id] ? <span className="badge num">{cart[m.id]}</span> : null}
                  <span className="art-wrap">
                    <FoodArt menu={m} />
                    {p && <span className="promo-tag">−{p.diskon}%</span>}
                    {m.id === topId && <span className="sticker">terlaris!</span>}
                  </span>
                  <b>{m.nama}</b>
                  <span className="row between">
                    <span className="price num">{h < m.harga ? <>{rp(h)} <s className="muted" style={{ fontSize: 12, fontWeight: 500 }}>{jt(m.harga)}</s></> : jt(m.harga)}</span>
                    <span className={`pill ${s <= 0 ? "bad" : s < 10 ? "warn" : "good"}`}>{s <= 0 ? "Habis" : s === Infinity ? "ready" : `sisa ${s}`}</span>
                  </span>
                </button>
              );
            })}
            {!list.length && <div className="empty">Belum ada menu. Tambahin dulu di halaman Menu & Resep.</div>}
          </div>

          <div className="card">
            <h2 style={{ marginBottom: 6 }}>Antrian pesanan</h2>
            {antrian.length ? antrian.map((o) => (
              <div className="ord" key={o.id}>
                <span className="rank num" style={{ width: "auto", padding: "0 8px" }}>#{o.nomor}</span>
                <span className="grow ellip">{o.order_items.map((it) => `${menus.find((m) => m.id === it.menu_id)?.nama ?? "?"} ×${it.qty}`).join(", ")}</span>
                {o.status === "disiapkan"
                  ? <button className="btn sm primary" onClick={() => setStatus(o.id, "siap")}>Siap</button>
                  : <button className="btn sm" onClick={() => setStatus(o.id, "selesai")}>Selesai</button>}
              </div>
            )) : <div className="empty">Nggak ada pesanan yang lagi disiapin.</div>}
          </div>
        </div>

        {sheet && <div className="scrim" onClick={() => setSheet(false)} />}
        <div className={`card cart cart-panel ${sheet ? "open" : ""}`}>
          <div className="row between"><h2>Pesanan baru</h2><button className="btn sm sheet-close" onClick={() => setSheet(false)} aria-label="Tutup">✕</button></div>
          {items.length ? items.map(({ m, q }) => (
            <div className="cart-item" key={m.id}>
              <Thumb menu={m} />
              <span className="grow"><b style={{ fontSize: 14 }}>{m.nama}</b><br />
                <span className="muted num" style={{ fontSize: 13 }}>{rp(hargaJual(m, promos))}{promoOf(m.id) ? ` · kode ${promoOf(m.id)!.kode}` : ""}</span></span>
              <span className="qty">
                <button onClick={() => dec(m.id)} aria-label="Kurangi">−</button>
                <b className="num" style={{ minWidth: 18, textAlign: "center" }}>{q}</b>
                <button onClick={() => add(m)} aria-label="Tambah">+</button>
              </span>
            </div>
          )) : <div className="tip" style={{ textAlign: "center" }}>🛸 Pesanan masih kosong.<br />Tap menu buat mulai.</div>}
          <div>
            <p className="eyebrow muted" style={{ marginBottom: 8 }}>Metode bayar</p>
            <div className="row wrap">
              {(Object.keys(BAYAR) as (keyof typeof BAYAR)[]).map((b) => (
                <button key={b} className={`chip ${pay === b ? "on" : ""}`} onClick={() => setPay(b)}>{BAYAR[b]} {b}</button>
              ))}
            </div>
          </div>
          <div className="total"><span className="muted" style={{ fontWeight: 700 }}>{count} item</span><b className="num">{rp(total)}</b></div>
          <button className="btn primary block" style={{ fontSize: 16, padding: 14 }} onClick={checkout} disabled={!items.length || busy}>
            {busy ? "Meluncur…" : "🚀 Luncurkan pesanan"}
          </button>
        </div>
      </div>

      {items.length > 0 && !sheet && (
        <button className="btn primary cartbar between" onClick={() => setSheet(true)}>
          <span>🛒 {count} item</span><span className="num">{rp(total)} →</span>
        </button>
      )}

      {struk && (
        <div className="modal-wrap" onClick={(e) => e.target === e.currentTarget && setStruk(null)}>
          <div className="card modal stack" role="dialog" aria-modal="true" aria-label="Struk pesanan">
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 42 }}>🎉</div><h2>Pesanan #{struk.nomor} meluncur!</h2><p className="muted">Nomornya langsung muncul di antrian layar TV.</p></div>
            <div style={{ display: "grid", placeItems: "center" }}>
              <div className="receipt" style={{ transform: "none" }}>
                <div className="c"><b>{settings.nama_toko.toUpperCase()}</b><br />#{struk.nomor} · {struk.jam}</div><hr />
                {struk.items.map((x) => <div className="r" key={x.m.id}><span>{x.m.nama} x{x.q}</span><span>{(x.q * x.h).toLocaleString("id-ID")}</span></div>)}
                <hr /><div className="r"><b>TOTAL</b><b>{struk.total.toLocaleString("id-ID")}</b></div>
                <div className="r"><span>Bayar</span><span>{struk.bayar}</span></div>
              </div>
            </div>
            <div className="row">
              <button className="btn grow" onClick={() => navigator.clipboard?.writeText(strukText).then(() => toast("Struk tersalin, tinggal paste di WA 📲")).catch(() => toast("Gagal menyalin"))}>📋 Salin struk</button>
              <button className="btn primary grow" onClick={() => setStruk(null)}>Pesanan baru</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
