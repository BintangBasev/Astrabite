"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setInfo(""); setBusy(true);
    const supabase = createClient();
    const res = mode === "masuk"
      ? await supabase.auth.signInWithPassword({ email, password: pw })
      : await supabase.auth.signUp({ email, password: pw });
    setBusy(false);
    if (res.error) { setErr(res.error.message); return; }
    if (mode === "daftar" && !res.data.session) {
      setInfo("Akun dibuat. Cek email buat konfirmasi, lalu masuk.");
      setMode("masuk");
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="auth">
      <form className="card stack" onSubmit={submit}>
        <div className="brand">
          <svg className="mascot"><use href="#astro" /></svg>
          <div><b>AstraBite</b><small>by Astratech</small></div>
        </div>
        <div>
          <h1 style={{ fontSize: 26 }}>{mode === "masuk" ? "Masuk dulu, Bos" : "Bikin akun"} <span className="scribble">👋</span></h1>
          <p className="muted" style={{ marginTop: 6 }}>Kasir, stok, promo, dan Astro siap kerja.</p>
        </div>
        {err && <div className="err">{err}</div>}
        {info && <div className="okmsg">{info}</div>}
        <div className="field"><label htmlFor="email">Email</label>
          <input className="input" id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="pw">Password</label>
          <input className="input" id="pw" type="password" autoComplete={mode === "masuk" ? "current-password" : "new-password"} minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <button className="btn primary" type="submit" disabled={busy}>{busy ? "Sebentar…" : mode === "masuk" ? "Masuk" : "Daftar"}</button>
        <p className="muted" style={{ fontSize: 13.5, textAlign: "center" }}>
          {mode === "masuk" ? "Belum punya akun? " : "Udah punya akun? "}
          <button type="button" className="link-btn" onClick={() => setMode(mode === "masuk" ? "daftar" : "masuk")}>
            {mode === "masuk" ? "Daftar" : "Masuk"}
          </button>
        </p>
      </form>
    </div>
  );
}
