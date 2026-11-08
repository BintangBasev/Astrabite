"use client";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import FoodArt from "./FoodArt";
import { jt, rp } from "@/lib/format";
import { PLAT } from "@/lib/platform";
import type { TvFeed, TvSlideKey } from "@/lib/types";

type Slide = { t: TvSlideKey; i?: number };
const POLL_MS = 15000;

function useClock() {
  const [now, setNow] = useState("");
  useEffect(() => {
    const f = () => setNow(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }));
    f();
    const t = setInterval(f, 10000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function TvPlayer({ token, onLabel }: { token: string; onLabel?: (s: string) => void }) {
  const [feed, setFeed] = useState<TvFeed | null>(null);
  const [err, setErr] = useState("");
  const [idx, setIdx] = useState(0);
  const [qr, setQr] = useState("");
  const clock = useClock();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/tv/${token}`, { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) { setErr(j.error ?? "Gagal memuat"); return; }
        setFeed(j); setErr("");
      } catch {
        if (alive) setErr("Koneksi terputus, mencoba lagi…");
      }
    };
    load();
    const t = setInterval(load, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [token]);

  const ig = feed?.settings.instagram;
  useEffect(() => {
    if (!ig) { setQr(""); return; }
    QRCode.toString(`https://instagram.com/${ig}`, { type: "svg", margin: 0 }).then(setQr).catch(() => setQr(""));
  }, [ig]);

  const slides = useMemo<Slide[]>(() => {
    if (!feed) return [];
    const p = feed.settings.tv_playlist, l: Slide[] = [];
    if (p.menu) l.push({ t: "menu" });
    if (p.promo) feed.promos.forEach((_, i) => l.push({ t: "promo", i }));
    if (p.best && feed.terlaris.length) l.push({ t: "best" });
    if (p.queue) l.push({ t: "queue" });
    if (p.social && (feed.settings.instagram || feed.settings.tiktok)) l.push({ t: "social" });
    if (p.testi) feed.settings.tv_testimoni.forEach((_, i) => l.push({ t: "testi", i }));
    return l;
  }, [feed]);

  const dur = feed?.settings.tv_durasi ?? 8;
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => i + 1), dur * 1000);
    return () => clearInterval(t);
  }, [dur]);

  const cur = slides.length ? slides[idx % slides.length] : null;
  useEffect(() => {
    if (onLabel) onLabel(cur ? `Slide ${(idx % slides.length) + 1}/${slides.length}` : "Playlist kosong");
  }, [cur, idx, slides.length, onLabel]);

  if (!feed) {
    return <div className="tv-frame"><div className="tv-slide"><div className="tv-empty">{err || "Memuat layar…"}</div></div></div>;
  }

  const menu = (id: string) => feed.menus.find((m) => m.id === id);
  const ticker = feed.settings.tv_ticker || feed.settings.nama_toko;

  const body = (() => {
    if (!cur) return <div className="tv-empty">Nyalain minimal satu slide di playlist</div>;
    if (cur.t === "menu") {
      const items = feed.menus.filter((m) => !(feed.settings.tv_sembunyikan_habis && m.habis)).slice(0, 6);
      return (
        <>
          <h3 className="tv-h">Menu hari ini <span className="tv-scr">fresh dari dapur!</span></h3>
          <div className="tv-menu">
            {items.map((m) => {
              const p = feed.promos.find((x) => x.menu_id === m.id);
              return (
                <div className="tv-item" key={m.id}>
                  {p && <span className="tv-off">−{p.diskon}%</span>}
                  <FoodArt menu={m} />
                  <div style={{ minWidth: 0 }}>
                    <b>{m.nama}</b><small>{m.kategori}</small>
                    <span className="tv-price num">{jt(m.harga_jual)}{m.harga_jual < m.harga && <s>{jt(m.harga)}</s>}</span>
                  </div>
                  {m.habis && <div className="tv-habis"><span>habis, besok lagi ya!</span></div>}
                </div>
              );
            })}
          </div>
        </>
      );
    }
    if (cur.t === "promo") {
      const p = feed.promos[cur.i ?? 0], m = p && menu(p.menu_id);
      if (!p || !m) return null;
      return (
        <div className="tv-2col">
          <div>
            <span className="tv-tag">promo hari ini!</span>
            <div className="tv-big">−{p.diskon}%</div>
            <div className="tv-name">{m.nama}</div>
            <div className="tv-sub">Cuma <b>{rp(m.harga_jual)}</b> <s>{rp(m.harga)}</s> · sebut kode <b>{p.kode}</b> di kasir</div>
          </div>
          <div className="tv-art"><FoodArt menu={m} /><span className="sticker">wajib coba!</span></div>
        </div>
      );
    }
    if (cur.t === "best") {
      const t = feed.terlaris.map((x) => ({ m: menu(x.menu_id), q: x.qty })).filter((x) => x.m);
      const order = [t[1], t[0], t[2]].filter(Boolean);
      return (
        <>
          <h3 className="tv-h">Paling laris hari ini <span className="tv-scr">🔥 no debat</span></h3>
          <div className="tv-pod">
            {order.map((o) => {
              const r = t.indexOf(o) + 1;
              return <div key={o.m!.id} className={r === 1 ? "first" : ""}><FoodArt menu={o.m!} /><span className="tv-rank">#{r}</span><b>{o.m!.nama}</b><small>{o.q} porsi terjual</small></div>;
            })}
          </div>
        </>
      );
    }
    if (cur.t === "queue") {
      return (
        <>
          <h3 className="tv-h">Antrian pesanan <span className="tv-scr">sabar ya, bestie</span></h3>
          <div className="tv-q">
            <div className="tv-qp"><h4>Lagi disiapin</h4><div className="tv-nums">
              {feed.antrian.disiapkan.length ? feed.antrian.disiapkan.map((n) => <span className="tv-num" key={n}>#{n}</span>) : <span className="tv-sub">Kosong</span>}</div></div>
            <div className="tv-qp ready"><h4>Siap diambil ✓</h4><div className="tv-nums">
              {feed.antrian.siap.length ? feed.antrian.siap.map((n) => <span className="tv-num" key={n}>#{n}</span>) : <span className="tv-sub" style={{ color: "#2A1A10" }}>Belum ada</span>}</div></div>
          </div>
        </>
      );
    }
    if (cur.t === "social") {
      const s = feed.settings;
      return (
        <div className="tv-2col">
          <div>
            <span className="tv-tag">follow & dapet diskon</span>
            <div className="tv-name" style={{ fontSize: "4.4cqw", marginTop: "2cqw" }}>@{s.instagram || s.tiktok}</div>
            <div className="tv-sub" style={{ fontSize: "2.2cqw" }}>Upload foto makanan lo, tag kami, terus tunjukin ke kasir ✨</div>
            <div className="row" style={{ gap: "1cqw", marginTop: "2cqw" }}>
              {(["ig", "tiktok", "wa"] as const).filter((k) => (k === "ig" ? s.instagram : k === "tiktok" ? s.tiktok : s.whatsapp)).map((k) => (
                <span key={k} className="plat" style={{ width: "4.4cqw", height: "4.4cqw", borderRadius: "1.2cqw", fontSize: "1.4cqw", background: PLAT[k].c }}>{PLAT[k].s}</span>
              ))}
            </div>
          </div>
          {qr ? <div className="tv-qr"><div dangerouslySetInnerHTML={{ __html: qr }} />Scan buat follow</div> : <div />}
        </div>
      );
    }
    if (cur.t === "testi") {
      const q = feed.settings.tv_testimoni[cur.i ?? 0];
      const m = feed.terlaris[0] ? menu(feed.terlaris[0].menu_id) : feed.menus[0];
      return (
        <div className="tv-2col">
          <div><div className="tv-quote">{q}</div><div className="tv-stars">★★★★★</div><div className="tv-sub">Kata pelanggan {feed.settings.nama_toko}</div></div>
          {m && <div className="tv-art" style={{ maxWidth: "28cqw" }}><FoodArt menu={m} /></div>}
        </div>
      );
    }
    return null;
  })();

  return (
    <div className="tv-frame">
      <div className="tv-deco" aria-hidden="true"><i>🌶️</i><i>✨</i><i>🍜</i><i>🧋</i></div>
      <div className="tv-top">
        <span className="tv-logo"><svg><use href="#astro" /></svg>{feed.settings.nama_toko}</span>
        <span className="tv-clock num">{clock}</span>
      </div>
      <div className="tv-slide" key={`${idx}-${cur?.t}`}>{body}</div>
      <div className="tv-prog"><i key={idx} style={{ animationDuration: `${dur}s` }} /></div>
      <div className="tv-ticker"><div className="tv-track"><span>{ticker}</span><span>{ticker}</span></div></div>
    </div>
  );
}
