"use client";
import { hint } from "@/components/LoadError";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card stack" role="alert" style={{ maxWidth: 680 }}>
      <h2>Ada yang error 😵</h2>
      <div className="err" style={{ fontFamily: "var(--f-mono)", whiteSpace: "pre-wrap" }}>
        {error.message}{error.digest ? `\nKode: ${error.digest}` : ""}
      </div>
      <p>{hint(error.message)}</p>
      <div className="row"><button className="btn primary" onClick={reset}>Coba lagi</button><a className="btn" href="/">Ke dashboard</a></div>
    </div>
  );
}
