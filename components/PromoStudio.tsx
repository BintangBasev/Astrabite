"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "./toast";
import { confetti } from "@/lib/confetti";
import { createClient } from "@/lib/supabase/client";
import { GRAD, PLAT, type PlatKey } from "@/lib/platform";
import { hariIniWib, rp } from "@/lib/format";
import type { ContentPost, Menu, Promo, Settings } from "@/lib/types";

const TUJUAN = { promo: "Promo diskon", baru: "Kenalin menu baru", sepi: "Ramaikan jam sepi", testi: "Testimoni pelanggan" };
const GAYA = { genz: "Gen Z lucu", fomo: "FOMO / urgent", santai: "Santai hangat", premium: "Premium aesthetic" };
type Out = {
  hooks: string[]; caption: string; hashtags: string[]; script: { waktu: string; visual: string; audio: string }[];
  diskon: number; harga_promo: number; kode: string | null; margin: number; max_diskon: number; jam_terbaik: string; jam_ramai: number;
};

export default function PromoStudio({ menus, promos, settings, posts }: { menus: Menu[]; promos: Promo[]; settings: Settings; posts: ContentPost[] }) {
  const router = useRouter();
  const [p, setP] = useState({ menu_id: menus[0]?.id ?? "", platform: "reels" as PlatKey, tujuan: "promo" as keyof typeof TUJUAN, gaya: "genz" as keyof typeof GAYA, diskon: 20 });
  const [out, setOut] = useState<Out | null>(null);
  const [hook, setHook] = useState(0);
  const [variasi, setVariasi] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [akun, setAkun] = useState({ instagram: settings.instagram, tiktok: settings.tiktok, whatsapp: settings.whatsapp });

  const m = menus.find((x) => x.id === p.menu_id);
  const pl = PLAT[p.platform];
  const disc = p.tujuan === "promo" || p.tujuan === "sepi";
  const capText = out ? `${out.hooks[hook]}\n\n${out.caption}${out.hashtags.length ? "\n\n" + out.hashtags.join(" ") : ""}` : "";
  const handle = p.platform === "tiktok" ? settings.tiktok : p.platform === "wa" || p.platform === "fb" ? settings.nama_toko : settings.instagram;

  const generate = async () => {
    if (!p.menu_id) return;
    setBusy(true); setErr("");
    const r = await fetch("/api/ai/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, variasi }) });
    const j = await r.json().catch(() => ({ error: "Respons server tidak valid" }));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? "Gagal bikin konten"); return; }
    setOut(j); setHook(0); setVariasi((v) => v + 1);
  };

  const simpanPost = async (status: "terjadwal" | "diposting") => {
    if (!out || !m) return;
    const besok = new Date(new Date(hariIniWib() + "T00:00:00+07:00").getTime() + 864e5);
    const jadwal = status === "terjadwal" ? new Date(besok.toISOString().slice(0, 10) + `T${out.jam_terbaik}:00+07:00`).toISOString() : new Date().toISOString();
    const { error } = await createClient().from("content_posts").insert({
      menu_id: m.id, platform: pl.n, tujuan: TUJUAN[p.tujuan], hook: out.hooks[hook], caption: capText, status, jadwal,
    });
    if (error) { toast(error.message); return; }
    if (status === "diposting") confetti();
    toast(status === "terjadwal" ? `Terjadwal besok jam ${out.jam_terbaik} 📅` : "Ditandai sudah diposting 🚀");
    router.refresh();
  };

  const aktifkan = async () => {
    if (!out?.kode || !m) return;
    const sb = createClient();
    await sb.from("promos").update({ aktif: false }).eq("menu_id", m.id).eq("aktif", true);
    const ada = promos.find((x) => x.kode === out.kode);
    const { error } = ada
      ? await sb.from("promos").update({ aktif: true, diskon: out.diskon }).eq("id", ada.id)
      : await sb.from("promos").insert({ menu_id: m.id, diskon: out.diskon, kode: out.kode });
    if (error) { toast(error.message); return; }
    toast(`Kode ${out.kode} aktif, harga di kasir & TV otomatis kepotong ✅`);
    router.refresh();
  };

  const matikan = async (id: string) => {
    const { error } = await createClient().from("promos").update({ aktif: false }).eq("id", id);
    if (error) toast(error.message); else { toast("Promo dimatikan"); router.refresh(); }
  };
  const ubahPost = async (id: string, status: ContentPost["status"]) => {
    const { error } = await createClient().from("content_posts").update({ status }).eq("id", id);
    if (error) toast(error.message); else router.refresh();
  };
  const simpanAkun = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = (s: string) => s.trim().replace(/^@/, "");
    const { error } = await createClient().from("settings").update({ instagram: clean(akun.instagram), tiktok: clean(akun.tiktok), whatsapp: akun.whatsapp.trim() }).eq("id", 1);
    if (error) toast(error.message); else { toast("Akun sosmed tersimpan ✅"); router.refresh(); }
  };

  const sel = <T extends string>(id: string, label: string, opts: Record<T, string>, val: T, on: (v: T) => void) => (
    <div className="field"><label htmlFor={id}>{label}</label>
      <select className="input" id={id} value={val} onChange={(e) => { on(e.target.value as T); setOut(null); }}>
        {(Object.entries(opts) as [T, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select></div>
  );

  const hookText = out?.hooks[hook] ?? (m ? `${m.nama}, siap bikin hari lo lebih enak ✨` : "");
  const short = out ? out.caption.slice(0, 70) : "Klik Generate buat bikin caption…";

  return (
    <>
      <div className="head">
        <div><h1>Promo Studio <span className="scribble">biar viral</span></h1><p>Hook, caption, hashtag, sampai script video. Ditulis Astro dari data penjualan lo.</p></div>
        <div className="row">
          {(["ig", "tiktok", "wa"] as const).filter((k) => (k === "ig" ? settings.instagram : k === "tiktok" ? settings.tiktok : settings.whatsapp)).map((k) => (
            <span key={k} className="plat sm" style={{ background: PLAT[k].c }} title={`${PLAT[k].n} terhubung`}>{PLAT[k].s}</span>
          ))}
        </div>
      </div>

      <div className="studio">
        <div className="stack">
          <div className="card stack">
            <div className="row between"><h2>Bikin konten promosi</h2><span className="pill" style={{ background: "var(--violet-t)", color: "var(--violet)" }}>✦ AI</span></div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))", gap: 12 }}>
              {sel("pm-menu", "Menu", Object.fromEntries(menus.map((x) => [x.id, `${x.emoji} ${x.nama}`])), p.menu_id, (v) => setP({ ...p, menu_id: v }))}
              {sel("pm-plat", "Platform", Object.fromEntries(Object.entries(PLAT).map(([k, v]) => [k, v.n])) as Record<PlatKey, string>, p.platform, (v) => setP({ ...p, platform: v }))}
              {sel("pm-goal", "Tujuan", TUJUAN, p.tujuan, (v) => setP({ ...p, tujuan: v }))}
              {sel("pm-tone", "Gaya bahasa", GAYA, p.gaya, (v) => setP({ ...p, gaya: v }))}
            </div>
            {disc && m && (
              <div className="field">
                <label htmlFor="pm-disk">Diskon <b style={{ color: "var(--ink)" }}>{p.diskon}%</b> · harga jadi {rp(Math.round((m.harga * (100 - p.diskon)) / 10000) * 100)}</label>
                <input type="range" id="pm-disk" min={5} max={50} step={5} value={p.diskon} onChange={(e) => { setP({ ...p, diskon: Number(e.target.value) }); setOut(null); }} />
              </div>
            )}
            {err && <div className="err">{err}</div>}
            <button className="btn primary" onClick={generate} disabled={busy || !m}>{busy ? "Astro lagi nulis…" : out ? "↻ Generate versi lain" : "✦ Generate pakai Astro"}</button>
          </div>

          {busy && (
            <div className="card" style={{ textAlign: "center", padding: "44px 20px" }}>
              <p style={{ fontWeight: 700 }}>✦ Astro lagi nulis konten<span className="typing"> <span /><span /><span /></span></p>
              <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>Ngecek data penjualan {m?.nama} + jam ramai pelanggan</p>
            </div>
          )}

          {out && !busy && (
            <>
              <div className="card stack">
                <h2>Pilih hook</h2>
                {out.hooks.map((h, i) => (
                  <button key={i} className={`hook-opt ${hook === i ? "on" : ""}`} onClick={() => setHook(i)}><span className="rank">{i + 1}</span><span>{h}</span></button>
                ))}
              </div>
              <div className="card stack">
                <div className="row between"><h2>Caption</h2>
                  <button className="btn sm" onClick={() => navigator.clipboard?.writeText(capText).then(() => toast("Caption tersalin ✅")).catch(() => toast("Gagal menyalin, blok teksnya manual ya"))}>Salin caption</button></div>
                <div className="cap">{capText}</div>
                {out.diskon > 0 && (out.margin < 45
                  ? <div className="tip" style={{ background: "var(--bad-bg)" }}>⚠️ <b>Hati-hati:</b> diskon {out.diskon}% bikin margin tinggal {out.margin}%. Astro saranin diskon maksimal {out.max_diskon}%.</div>
                  : <div className="tip" style={{ background: "var(--good-bg)" }}>✅ Margin setelah diskon masih {out.margin}%. Aman buat promo.</div>)}
              </div>
              {out.script.length > 0 && (
                <div className="card stack">
                  <h2>Script {pl.n} · 15 detik</h2>
                  <div className="scroll-x"><table className="tbl"><thead><tr><th>Waktu</th><th>Visual</th><th>Audio / teks</th></tr></thead>
                    <tbody>{out.script.map((r, i) => <tr key={i}><td className="num" style={{ whiteSpace: "nowrap", fontWeight: 700 }}>{r.waktu}</td><td>{r.visual}</td><td>{r.audio}</td></tr>)}</tbody></table></div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="stack">
          <div className="card stack">
            <div className="row between"><h2>Preview</h2><span className="row" style={{ gap: 8 }}><span className="plat sm" style={{ background: pl.c }}>{pl.s}</span><span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{pl.n}</span></span></div>
            {m && (
              <div className="phone"><div className="screen">
                {pl.vid ? (
                  <div className="vid" style={{ background: GRAD[m.warna] }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {m.foto_url ? <img className="cover" src={m.foto_url} alt="" /> : <span className="vid-emo"><span className="plate big"><span className="food">{m.emoji}</span></span></span>}
                    <span className="vid-hook">{hookText}</span>
                    <div className="vid-side"><span>♥<small>1rb</small></span><span>💬<small>98</small></span><span>↗<small>40</small></span></div>
                    <div className="vid-cap"><b>@{handle || "akunlo"}</b><br />{short}…<br />♪ sound trending</div>
                  </div>
                ) : (
                  <>
                    <div className="ph-head"><svg><use href="#astro" /></svg><b>{handle || settings.nama_toko}</b><span style={{ marginLeft: "auto", color: "#888" }}>•••</span></div>
                    <div className="post-img" style={{ background: GRAD[m.warna] }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {m.foto_url ? <img className="cover" src={m.foto_url} alt="" /> : <span className="plate"><span className="food">{m.emoji}</span></span>}
                      {out && out.diskon > 0 && <span className="post-badge">−{out.diskon}%</span>}
                      <span className="post-hook">{hookText}</span>
                    </div>
                    <div className="ph-body"><span style={{ fontSize: 16, letterSpacing: 6 }}>♡ 💬 ➤</span><br /><b>{handle || settings.nama_toko}</b> {short}… <span style={{ color: "#888" }}>selengkapnya</span></div>
                  </>
                )}
              </div></div>
            )}
            {out && (
              <>
                <div className="tip">🕑 <b>Waktu posting terbaik: {out.jam_terbaik}.</b> {p.tujuan === "sepi" ? "Sejam sebelum happy hour mulai." : `Pesanan paling rame sekitar jam ${out.jam_ramai}.00, jadi posting sejam sebelumnya.`}</div>
                <div className="row wrap">
                  <button className="btn primary grow" onClick={() => simpanPost("diposting")}>Tandai sudah diposting</button>
                  <button className="btn grow" onClick={() => simpanPost("terjadwal")}>Jadwalkan besok {out.jam_terbaik}</button>
                </div>
                {out.kode && <button className="btn pink block" onClick={aktifkan}>🎟️ Aktifkan kode {out.kode} di kasir</button>}
              </>
            )}
          </div>

          <form className="card stack" onSubmit={simpanAkun}>
            <h2>Akun sosmed</h2>
            <p className="muted" style={{ fontSize: 13 }}>Dipakai di caption, preview, dan slide QR di layar TV.</p>
            <div className="field"><label htmlFor="ak-ig">Instagram</label><input className="input" id="ak-ig" placeholder="astrabite.id" value={akun.instagram} onChange={(e) => setAkun({ ...akun, instagram: e.target.value })} /></div>
            <div className="field"><label htmlFor="ak-tt">TikTok</label><input className="input" id="ak-tt" placeholder="astrabite" value={akun.tiktok} onChange={(e) => setAkun({ ...akun, tiktok: e.target.value })} /></div>
            <div className="field"><label htmlFor="ak-wa">WhatsApp</label><input className="input" id="ak-wa" placeholder="0812…" value={akun.whatsapp} onChange={(e) => setAkun({ ...akun, whatsapp: e.target.value })} /></div>
            <button className="btn" type="submit">Simpan akun</button>
          </form>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", marginTop: 18 }}>
        <div className="card">
          <h2 style={{ marginBottom: 4 }}>Kalender konten</h2>
          <div className="list">
            {posts.map((c) => (
              <div key={c.id}>
                <span className="grow"><b className="ellip" style={{ display: "block" }}>{c.hook}</b>
                  <span className="muted" style={{ fontSize: 12.5 }}>{c.platform} · {c.jadwal ? new Date(c.jadwal).toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) : "-"}</span></span>
                {c.status === "terjadwal"
                  ? <button className="pill warn" style={{ border: 0, cursor: "pointer" }} onClick={() => ubahPost(c.id, "diposting")} title="Tandai sudah diposting">Terjadwal</button>
                  : <span className={`pill ${c.status === "diposting" ? "good" : ""}`}>{c.status === "diposting" ? "Diposting" : "Draft"}</span>}
              </div>
            ))}
            {!posts.length && <div className="empty">Belum ada konten. Generate, lalu jadwalkan.</div>}
          </div>
        </div>
        <div className="card">
          <h2 style={{ marginBottom: 4 }}>Promo aktif di kasir</h2>
          <div className="list">
            {promos.filter((x) => x.aktif).map((x) => {
              const mm = menus.find((y) => y.id === x.menu_id);
              return (
                <div key={x.id}>
                  <span className="emo">{mm?.emoji ?? "🎟️"}</span>
                  <span className="grow"><b>{mm?.nama ?? "Menu"} −{x.diskon}%</b><br /><span className="muted num" style={{ fontSize: 12.5 }}>Kode {x.kode} · dipakai {x.dipakai}×</span></span>
                  <button className="btn sm" onClick={() => matikan(x.id)}>Matikan</button>
                </div>
              );
            })}
            {!promos.some((x) => x.aktif) && <div className="empty">Belum ada promo aktif.</div>}
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>“Dipakai” dihitung dari porsi yang terjual pakai harga promo di kasir.</p>
        </div>
      </div>
    </>
  );
}
