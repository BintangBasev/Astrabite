"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import TvPlayer from "./TvPlayer";
import { toast } from "./toast";
import { createClient } from "@/lib/supabase/client";
import type { Settings, TvScreen, TvSlideKey } from "@/lib/types";

const TYPES: [TvSlideKey, string, string][] = [
  ["menu", "Daftar menu", "Harga promo & menu habis ikut update"],
  ["promo", "Promo aktif", "Diambil dari Promo Studio"],
  ["best", "Best seller hari ini", "Dihitung dari data kasir"],
  ["queue", "Antrian pesanan", "Nomor pesanan disiapin & siap diambil"],
  ["social", "Sosmed + QR", "Butuh akun Instagram/TikTok di Promo Studio"],
  ["testi", "Testimoni pelanggan", "Isi di kolom testimoni di bawah"],
];
const online = (s: TvScreen) => !!s.last_seen && Date.now() - new Date(s.last_seen).getTime() < 60_000;

export default function TvManager({ settings, screens }: { settings: Settings; screens: TvScreen[] }) {
  const router = useRouter();
  const [st, setSt] = useState(settings);
  const [testi, setTesti] = useState(settings.tv_testimoni.join("\n"));
  const [label, setLabel] = useState("");
  const [rev, setRev] = useState(0);
  const [baru, setBaru] = useState({ nama: "", lokasi: "" });
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const onLabel = useCallback((s: string) => setLabel(s), []);

  const simpan = async (patch: Partial<Settings>) => {
    const next = { ...st, ...patch };
    setSt(next);
    const { error } = await createClient().from("settings").update(patch).eq("id", 1);
    if (error) { toast(error.message); return; }
    setRev((r) => r + 1);
  };
  const tambahLayar = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await createClient().from("tv_screens").insert({ nama: baru.nama.trim(), lokasi: baru.lokasi.trim() });
    if (error) { toast(error.message); return; }
    toast("Layar baru ditambahin 📺"); setBaru({ nama: "", lokasi: "" }); router.refresh();
  };
  const hapus = async (s: TvScreen) => {
    const { error } = await createClient().from("tv_screens").delete().eq("id", s.id);
    if (error) toast(error.message); else { toast(`${s.nama} dihapus`); router.refresh(); }
  };
  const url = (s: TvScreen) => `${origin}/tv/${s.token}`;
  const sw = (on: boolean, label: string, f: () => void) => (
    <button className={`switch ${on ? "on" : ""}`} role="switch" aria-checked={on} aria-label={label} onClick={f} />
  );

  return (
    <>
      <div className="head">
        <div><h1>Layar TV <span className="scribble">on air!</span></h1><p>Pasang di TV toko. Menu, promo, sama antrian pesanan update otomatis dari kasir.</p></div>
        <span className="pill good">● {screens.filter(online).length} layar online</span>
      </div>
      <div className="tvgrid">
        <div className="stack">
          <div className="card stack">
            <div className="row between wrap"><h2>Preview layar</h2>
              <span className="row" style={{ gap: 8 }}><span className="live">● LIVE</span><span className="muted num" style={{ fontSize: 13, fontWeight: 600 }}>{label}</span></span></div>
            {screens[0]
              ? <div><div className="tv-bezel"><TvPlayer key={rev} token={screens[0].token} onLabel={onLabel} /></div><div className="tv-stand" /></div>
              : <div className="empty">Tambah layar dulu buat lihat preview.</div>}
            {screens[0] && origin && <a className="btn primary" href={url(screens[0])} target="_blank" rel="noreferrer">📺 Buka layar penuh</a>}
          </div>
          <div className="card stack">
            <h2>Teks berjalan & testimoni</h2>
            <div className="field"><label htmlFor="tv-ticker">Strip kuning di bawah layar</label>
              <input className="input" id="tv-ticker" value={st.tv_ticker} onChange={(e) => setSt({ ...st, tv_ticker: e.target.value })} onBlur={() => simpan({ tv_ticker: st.tv_ticker })} /></div>
            <div className="field"><label htmlFor="tv-testi">Testimoni pelanggan (satu per baris)</label>
              <textarea className="input" id="tv-testi" value={testi} onChange={(e) => setTesti(e.target.value)}
                onBlur={() => simpan({ tv_testimoni: testi.split("\n").map((x) => x.trim()).filter(Boolean) })} /></div>
            <p className="muted" style={{ fontSize: 12.5 }}>Tersimpan otomatis waktu lo klik di luar kolom.</p>
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <div className="row between" style={{ marginBottom: 4 }}><h2>Playlist</h2>
              <div className="row" style={{ gap: 6 }}><label htmlFor="tv-dur" className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>Tiap slide</label>
                <select className="input" id="tv-dur" style={{ width: "auto", padding: "6px 10px" }} value={st.tv_durasi} onChange={(e) => simpan({ tv_durasi: Number(e.target.value) })}>
                  {[5, 8, 12, 20].map((d) => <option key={d} value={d}>{d} dtk</option>)}</select></div></div>
            <div className="list">
              {TYPES.map(([k, n, d]) => (
                <div key={k}><span className="grow"><b>{n}</b><br /><span className="muted" style={{ fontSize: 12.5 }}>{d}</span></span>
                  {sw(st.tv_playlist[k], `Tampilkan ${n}`, () => simpan({ tv_playlist: { ...st.tv_playlist, [k]: !st.tv_playlist[k] } }))}</div>
              ))}
              <div><span className="grow"><b>Sembunyikan menu yang habis</b><br /><span className="muted" style={{ fontSize: 12.5 }}>Kalau mati, menu habis tampil dengan label “habis”</span></span>
                {sw(st.tv_sembunyikan_habis, "Sembunyikan menu habis", () => simpan({ tv_sembunyikan_habis: !st.tv_sembunyikan_habis }))}</div>
            </div>
          </div>
          <div className="card stack">
            <h2>Layar terhubung</h2>
            <div className="list">
              {screens.map((s) => (
                <div key={s.id} style={{ flexWrap: "wrap" }}>
                  <span className="tvico">📺</span>
                  <span className="grow"><b>{s.nama}</b><br /><span className="muted" style={{ fontSize: 12.5 }}>{s.lokasi || "—"}</span></span>
                  <span className={`pill ${online(s) ? "good" : "bad"}`}>{online(s) ? "● Online" : "Offline"}</span>
                  <div style={{ flexBasis: "100%", display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="url-box grow">{url(s)}</span>
                    <button className="btn sm" onClick={() => navigator.clipboard?.writeText(url(s)).then(() => toast("Link layar tersalin")).catch(() => toast("Gagal menyalin"))}>Salin</button>
                    <button className="btn sm" onClick={() => hapus(s)} aria-label={`Hapus ${s.nama}`}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="tip">
              <b>Cara pasang:</b> buka link layar di browser Smart TV, Android TV box, Chromecast, atau laptop yang dicolok HDMI. Klik sekali buat layar penuh. Data update sendiri tiap 15 detik.
            </div>
            <form className="stack" style={{ gap: 10 }} onSubmit={tambahLayar}>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,140px),1fr))", gap: 10 }}>
                <div className="field"><label htmlFor="ly-nama">Nama layar</label><input className="input" id="ly-nama" required placeholder="TV Area makan" value={baru.nama} onChange={(e) => setBaru({ ...baru, nama: e.target.value })} /></div>
                <div className="field"><label htmlFor="ly-lok">Keterangan</label><input className="input" id="ly-lok" placeholder="32 inci · Chromecast" value={baru.lokasi} onChange={(e) => setBaru({ ...baru, lokasi: e.target.value })} /></div>
              </div>
              <button className="btn" type="submit">+ Tambah layar</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
