"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/", ic: "home", t: "Mission Control", s: "Dashboard", short: "Home" },
  { href: "/kasir", ic: "kasir", t: "Launchpad", s: "Kasir", short: "Kasir" },
  { href: "/stok", ic: "stok", t: "Fuel Tank", s: "Stok bahan", short: "Stok" },
  { href: "/menu", ic: "menu", t: "Menu & Resep", s: "HPP otomatis", short: "Menu" },
  { href: "/promo", ic: "promo", t: "Promo Studio", s: "Konten sosmed AI", short: "Promo" },
  { href: "/tv", ic: "tv", t: "Layar TV", s: "Menu & promo di toko", short: "TV" },
  { href: "/cuan", ic: "cuan", t: "Cuan Tracker", s: "Pengeluaran", short: "Cuan" },
  { href: "/astro", ic: "astro", t: "Chat Astro", s: "Asisten AI", short: "Astro" },
];

const BGS = [
  { v: "doodle", n: "🍜 Doodle makanan", sw: "background-image:var(--doodle);background-size:130px" },
  { v: "gingham", n: "🧺 Taplak warung", sw: "background-image:linear-gradient(90deg,rgba(226,61,36,.12) 50%,transparent 50%),linear-gradient(rgba(226,61,36,.12) 50%,transparent 50%);background-size:20px 20px" },
  { v: "plain", n: "⬜ Polos", sw: "" },
];

function toggleTheme() {
  const r = document.documentElement;
  const dark = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  r.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem("ab-theme", r.dataset.theme); } catch {}
}

export default function Shell({ children, email }: { children: React.ReactNode; email: string }) {
  const path = usePathname();
  const router = useRouter();
  const [bgOpen, setBgOpen] = useState(false);
  const [bg, setBg] = useState("doodle");
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setBg(document.documentElement.dataset.bg || "doodle"); }, []);
  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    v.classList.remove("enter");
    void v.offsetWidth;
    v.classList.add("enter");
    const t = setTimeout(() => v.classList.remove("enter"), 1100);
    window.scrollTo(0, 0);
    return () => clearTimeout(t);
  }, [path]);

  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const pickBg = (v: string) => {
    document.documentElement.dataset.bg = v;
    setBg(v);
    try { localStorage.setItem("ab-bg", v); } catch {}
  };
  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const tools = (
    <span className="row" style={{ gap: 6 }}>
      <button className="btn sm" onClick={() => setBgOpen(true)} aria-label="Ganti latar">🎨</button>
      <button className="btn sm" onClick={toggleTheme} aria-label="Ganti tema">🌗</button>
    </span>
  );

  return (
    <div className="app">
      <aside className="side" aria-label="Navigasi">
        <div className="brand">
          <svg className="mascot"><use href="#astro" /></svg>
          <div><b>AstraBite</b><small>by Astratech</small></div>
        </div>
        <nav className="nav">
          {NAV.map((x) => (
            <Link key={x.href} href={x.href} className={active(x.href) ? "on" : ""}>
              <svg className="ic"><use href={`#i-${x.ic}`} /></svg>
              <span>{x.t}<small>{x.s}</small></span>
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <div className="card pop-violet" style={{ padding: 14 }}>
            <p style={{ fontWeight: 700, fontFamily: "var(--f-display)" }}>✦ Tanya Astro</p>
            <p style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>&quot;Stok apa yang harus dibeli buat besok?&quot;</p>
            <Link className="btn sm" href="/astro" style={{ marginTop: 10 }}>Buka chat</Link>
          </div>
          <p className="muted ellip" style={{ fontSize: 12 }} title={email}>{email}</p>
          <div className="row between">
            <button className="btn sm" onClick={logout}>Keluar</button>
            {tools}
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="brand">
            <svg className="mascot" style={{ width: 38, height: 38 }}><use href="#astro" /></svg>
            <div><b style={{ fontSize: 17 }}>AstraBite</b><small>by Astratech</small></div>
          </div>
          <span className="row" style={{ gap: 6 }}>
            {tools}
            <button className="btn sm" onClick={logout} aria-label="Keluar">⎋</button>
          </span>
        </div>
        <div id="view" ref={viewRef}>{children}</div>
      </main>

      <nav className="bottom" aria-label="Navigasi bawah">
        {NAV.map((x) => (
          <Link key={x.href} href={x.href} className={active(x.href) ? "on" : ""}>
            <svg className="ic"><use href={`#i-${x.ic}`} /></svg>
            {x.short}
          </Link>
        ))}
      </nav>

      {bgOpen && (
        <div className="modal-wrap" onClick={(e) => e.target === e.currentTarget && setBgOpen(false)}>
          <div className="card modal stack" role="dialog" aria-modal="true" aria-label="Pilih latar">
            <div className="row between"><h2>Pilih latar 🎨</h2><button className="btn sm" onClick={() => setBgOpen(false)} aria-label="Tutup">✕</button></div>
            <div className="bg-opts">
              {BGS.map((b) => (
                <button key={b.v} className={`bg-opt ${bg === b.v ? "on" : ""}`} onClick={() => pickBg(b.v)}>
                  <span className="bg-sw" style={Object.fromEntries(b.sw.split(";").filter(Boolean).map((d) => {
                    const [k, ...v] = d.split(":");
                    return [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.join(":")];
                  }))} />
                  {b.n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
