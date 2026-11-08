/** Ditampilkan kalau data gagal dimuat dari Supabase, lengkap dengan pesan asli + petunjuk. */
export function hint(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("does not exist") || m.includes("could not find") || m.includes("schema cache"))
    return "Tabel atau fungsi database belum ada. Jalankan ulang file supabase/migrations/20261108000000_init.sql di SQL Editor Supabase.";
  if (m.includes("jwt") || m.includes("api key") || m.includes("apikey"))
    return "Kunci Supabase salah. Cek NEXT_PUBLIC_SUPABASE_ANON_KEY di Vercel, lalu Redeploy.";
  if (m.includes("fetch failed") || m.includes("enotfound") || m.includes("network"))
    return "Server tidak bisa menghubungi Supabase. Cek NEXT_PUBLIC_SUPABASE_URL di Vercel, lalu Redeploy.";
  if (m.includes("permission denied") || m.includes("row-level security"))
    return "Akses ditolak database. Pastikan sudah login dan policy RLS dari file migrasi sudah terpasang.";
  return "Kirim pesan di atas ke developer supaya bisa dicek.";
}

export default function LoadError({ error, where }: { error: unknown; where: string }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="card stack" role="alert" style={{ maxWidth: 680 }}>
      <h2>Halaman {where} gagal dimuat 😵</h2>
      <div className="err" style={{ fontFamily: "var(--f-mono)", whiteSpace: "pre-wrap" }}>{msg}</div>
      <p>{hint(msg)}</p>
    </div>
  );
}
