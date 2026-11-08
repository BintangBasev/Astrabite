"use client";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
const SUGS = [
  "Omzet hari ini berapa?", "Menu apa yang paling laku?", "Stok apa yang mau habis?", "Besok siapin berapa porsi?",
  "Untung minggu ini?", "Harga mana yang perlu naik?", "Kasih ide promo buat jam sepi",
];
const SALAM: Msg = { role: "assistant", content: "Halo Bos! 👋 Gue Astro. Gue bisa baca data penjualan, stok, menu, promo, sama pengeluaran lo. Mau tanya apa?" };

export default function AstroChat() {
  const [msgs, setMsgs] = useState<Msg[]>([SALAM]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [msgs]);

  const ask = async (q: string) => {
    if (!q.trim() || busy) return;
    const history: Msg[] = [...msgs.slice(1), { role: "user", content: q.trim() }];
    setMsgs([SALAM, ...history, { role: "assistant", content: "" }]);
    setInput(""); setBusy(true);
    try {
      const r = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history.slice(-20) }) });
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? "Astro lagi nggak bisa dihubungi");
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([SALAM, ...history, { role: "assistant", content: acc }]);
      }
    } catch (e) {
      setMsgs([SALAM, ...history, { role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : "Terjadi kesalahan"}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="head"><div><h1>Chat Astro</h1><p>Tanya pakai bahasa santai. Astro jawab dari data toko lo yang terbaru.</p></div></div>
      <div className="card chat">
        <div className="chat-head">
          <svg style={{ width: 40, height: 40, flex: "none" }}><use href="#astro" /></svg>
          <div><b>Astro</b><br /><span style={{ fontSize: 12.5, opacity: 0.85 }}>● online · baca data dapur lo</span></div>
        </div>
        <div className="msgs" ref={box} aria-live="polite">
          {msgs.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "me" : "bot"}`} style={{ whiteSpace: "pre-wrap" }}>
              {m.content || <span className="typing" aria-label="Astro sedang mengetik"><span /><span /><span /></span>}
            </div>
          ))}
        </div>
        <div className="chat-foot">
          <div className="sugs">{SUGS.map((s) => <button key={s} className="chip" onClick={() => ask(s)} disabled={busy}>{s}</button>)}</div>
          <form className="row" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
            <input className="input grow" id="chat-in" placeholder="Tulis pertanyaan…" autoComplete="off" value={input} onChange={(e) => setInput(e.target.value)} />
            <button className="btn primary" type="submit" disabled={busy} aria-label="Kirim">Kirim ➤</button>
          </form>
        </div>
      </div>
    </>
  );
}
