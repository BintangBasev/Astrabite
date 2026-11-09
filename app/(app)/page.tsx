import LoadError from "@/components/LoadError";
import Link from "next/link";
import FoodArt, { Thumb } from "@/components/FoodArt";
import DailyLog from "@/components/DailyLog";
import CountUp from "@/components/CountUp";
import { createClient } from "@/lib/supabase/server";
import { loadCore, loadDaily, loadToday, type DailyRow } from "@/lib/data";
import { HARI, HARI_PANJANG, hariIniWib, jamWib, jt, qtyFmt, rp, STATUS_LABEL, stokStatus } from "@/lib/format";

export const dynamic = "force-dynamic";

function Chart({ rows, target }: { rows: DailyRow[]; target: number }) {
  const W = 620, H = 250, L = 44, R = 10, T = 26, B = 30;
  const step = 500000;
  const max = Math.max(step, Math.ceil(Math.max(...rows.map((d) => d.omzet), target) / step) * step);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const bw = (W - L - R) / rows.length;
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grafik omzet 7 hari">
      <defs>
        <linearGradient id="gt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF8A2A" /><stop offset="1" stopColor="#E23D24" /></linearGradient>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end">{v ? jt(v) : "0"}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={y(target)} y2={y(target)} stroke="var(--pink)" strokeWidth={2} strokeDasharray="6 5" />
      <text x={W - R} y={y(target) - 6} textAnchor="end" style={{ fill: "var(--pink)", fontWeight: 800 }}>target {jt(target)}</text>
      {rows.map((d, i) => {
        const today = i === rows.length - 1;
        const x = L + i * bw + bw * 0.18, w = bw * 0.64, yy = y(d.omzet);
        const day = new Date(d.tanggal + "T12:00:00+07:00").getDay();
        return (
          <g key={d.tanggal}>
            <rect className="gb" style={{ animationDelay: `${i * 0.06}s` }} x={x} y={yy} width={w} height={Math.max(0, H - B - yy)} rx={8}
              fill={today ? "url(#gt)" : "var(--violet-t)"}><title>{`${HARI_PANJANG[day]}: ${rp(d.omzet)}`}</title></rect>
            <text x={x + w / 2} y={H - 10} textAnchor="middle" className={today ? "val" : ""}>{today ? "Hari ini" : HARI[day]}</text>
            {d.omzet > 0 && <text className="val" x={x + w / 2} y={yy - 7} textAnchor="middle">{jt(d.omzet)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

async function DashboardInner() {
  const sb = await createClient();
  const [core, today, daily, sum] = await Promise.all([
    loadCore(sb), loadToday(sb), loadDaily(sb, 7),
    sb.from("ai_summaries").select("isi").eq("tanggal", hariIniWib()).maybeSingle(),
  ]);
  const { menus, ings, promos, settings } = core;
  const menu = (id: string) => menus.find((m) => m.id === id);
  const target = settings.target_harian;
  const pct = Math.min(100, (today.omzet / target) * 100);
  const kritis = ings.filter((i) => stokStatus(i.stok, i.stok_min) !== "good");
  const tm = today.top[0] ? menu(today.top[0][0]) : menus[0];
  const kemarin = daily.length > 1 ? daily[daily.length - 2].omzet : 0;
  const streak = (() => { let n = 0; for (let i = daily.length - 2; i >= 0 && daily[i].omzet >= target; i--) n++; return n; })();
  const jam = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }));
  const sapa = jam < 11 ? "Pagi" : jam < 15 ? "Siang" : jam < 18 ? "Sore" : "Malam";
  const tgl = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
  const aktif = promos.filter((p) => p.aktif);

  const fallback = [
    tm && today.top[0] ? `${tm.nama} paling laku hari ini (${today.top[0][1]} porsi).` : "Belum ada penjualan hari ini. Gas buka toko!",
    kemarin ? `Omzet ${today.omzet >= kemarin ? "udah ngalahin" : "masih di bawah"} kemarin (${jt(kemarin)}).` : `Target hari ini ${jt(target)}.`,
    kritis.length ? `${kritis.map((i) => i.nama).join(", ")} mulai menipis.` : "Stok bahan aman semua.",
    aktif.length ? `Promo aktif: ${aktif.map((p) => `${menu(p.menu_id)?.nama} −${p.diskon}%`).join(", ")}.` : "Belum ada promo aktif. Coba bikin di Promo Studio.",
  ];
  const ribbon = [
    tm ? `🔥 ${tm.nama} lagi rame` : "🔥 Siap jualan",
    `🎟️ ${aktif.map((p) => `${menu(p.menu_id)?.nama.split(" ")[0]} −${p.diskon}%`).join(" · ") || "Belum ada promo"}`,
    `🎯 Target ${jt(target)}`,
    `🧾 ${today.orders.length} transaksi hari ini`,
  ];

  return (
    <>
      <div className="hello">
        <div>
          <p className="eyebrow muted">{tgl}</p>
          <h1>{sapa}, Bos! <span className="scribble">{kritis.length ? "cek stok ya 👀" : "dapur aman 👌"}</span></h1>
        </div>
        {streak > 0 && <span className="streak">🔥 {streak} hari tembus target</span>}
      </div>

      <div className="today hero">
        <span className="floaty" aria-hidden="true"><i>🌶️</i><i>✨</i><i>🍜</i><i>🥚</i><i>🧋</i></span>
        <div>
          <span className="eyebrow">Omzet hari ini</span>
          <span className="big num"><CountUp value={today.omzet} money /></span>
          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
          <span className="s">{Math.round(pct)}% dari target {jt(target)} · kurang {rp(Math.max(0, target - today.omzet))} lagi</span>
          <div className="mini">
            <div><b className="num"><CountUp value={today.orders.length} /></b><span>transaksi</span></div>
            <div><b className="num">{jt(today.bersih)}</b><span>untung bersih</span></div>
            <div><b className="num">{today.orders.length ? jt(today.omzet / today.orders.length) : "-"}</b><span>per pesanan</span></div>
          </div>
        </div>
        {tm && (
          <div className="today-r">
            <FoodArt menu={tm} size="xl" />
            <span className="sticker">{today.top[0] ? "best seller hari ini!" : "menu andalan!"}</span>
            <span className="today-cap"><b>{tm.nama}</b>{today.top[0] ? ` · ${today.top[0][1]} porsi terjual` : ""}</span>
          </div>
        )}
      </div>

      <div className="ribbon" aria-hidden="true">
        <div className="tv-track">{[0, 1].map((k) => ribbon.map((r, i) => <span key={`${k}-${i}`}>{r}</span>))}</div>
      </div>

      {kritis.length > 0 && (
        <Link className="alert" href="/stok">
          <span style={{ fontSize: 20 }}>{kritis.map((i) => i.emoji).join(" ")}</span>
          <span className="grow">{kritis.map((i) => i.nama).join(" & ")} mulai tipis. Cek stok sekarang</span>
          <span aria-hidden="true">→</span>
        </Link>
      )}

      <div className="mc-grid">
        <div className="card chart">
          <div className="row between wrap" style={{ marginBottom: 10 }}>
            <h2>Omzet 7 hari terakhir</h2>
            <span className="muted num" style={{ fontWeight: 700 }}>Total {rp(daily.reduce((s, d) => s + d.omzet, 0))}</span>
          </div>
          <Chart rows={daily} target={target} />
        </div>
        <DailyLog awal={sum.data?.isi ?? null} fallback={fallback} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", marginTop: 18 }}>
        <div className="card">
          <h2 style={{ marginBottom: 8 }}>Top UMKM</h2>
          <div className="list">
            {today.top.slice(0, 5).map(([id, q], i) => {
              const m = menu(id);
              return m && (
                <div key={id}>
                  <span className={`rank ${["pop-sun", "pop-sky", "pop-pink", "", ""][i]}`}>{i + 1}</span>
                  <Thumb menu={m} />
                  <span className="grow ellip" style={{ fontWeight: 700 }}>{m.nama}</span>
                  <span className="num" style={{ fontWeight: 800 }}>{q}×</span>
                </div>
              );
            })}
            {!today.top.length && <div className="empty">Belum ada penjualan hari ini.</div>}
          </div>
        </div>
        <div className="card">
          <div className="row between"><h2 style={{ marginBottom: 8 }}>Stok paling tipis</h2><Link href="/stok" className="muted" style={{ fontWeight: 700, fontSize: 13 }}>Lihat semua</Link></div>
          <div className="list">
            {[...ings].sort((a, b) => a.stok / (a.stok_min || 1) - b.stok / (b.stok_min || 1)).slice(0, 5).map((i) => {
              const st = stokStatus(i.stok, i.stok_min);
              return (
                <div key={i.id}>
                  <span className="emo">{i.emoji}</span>
                  <span className="grow"><b>{i.nama}</b><br /><span className="muted num" style={{ fontSize: 13 }}>{qtyFmt(i.stok, i.satuan)} · min {qtyFmt(i.stok_min, i.satuan)}</span></span>
                  <span className={`pill ${st}`}>{STATUS_LABEL[st]}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <h2 style={{ marginBottom: 8 }}>Transaksi terakhir</h2>
          <div className="list">
            {today.orders.slice(0, 5).map((o) => (
              <div key={o.id}>
                <span className="rank num" style={{ width: "auto", padding: "0 8px", fontSize: 12, fontFamily: "var(--f-mono)", fontWeight: 500 }}>{jamWib(o.created_at)}</span>
                <span className="grow ellip">{o.order_items.map((it) => `${menu(it.menu_id)?.emoji ?? ""}×${it.qty}`).join(" ")}</span>
                <span className="num" style={{ fontWeight: 800 }}>{rp(o.total)}</span>
              </div>
            ))}
            {!today.orders.length && <div className="empty">Belum ada transaksi.</div>}
          </div>
        </div>
      </div>
    </>
  );
}

export default async function Dashboard() {
  try {
    return await DashboardInner();
  } catch (e) {
    return <LoadError error={e} where="Mission Control" />;
  }
}
