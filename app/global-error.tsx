"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, background: "#FFF5EA", color: "#24170F" }}>
        <h2>AstraBite error 😵</h2>
        <pre style={{ whiteSpace: "pre-wrap", background: "#FFE1DA", padding: 12, borderRadius: 12 }}>
          {error.message}{error.digest ? `\nKode: ${error.digest}` : ""}
        </pre>
        <button onClick={reset} style={{ padding: "10px 16px", borderRadius: 12 }}>Coba lagi</button>
      </body>
    </html>
  );
}
