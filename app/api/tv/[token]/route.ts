import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/** Feed publik buat layar TV. Tidak perlu login; aksesnya pakai token layar. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ error: "Token layar tidak valid" }, { status: 400 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await sb.rpc("tv_feed", { p_token: token }).then(
    (r) => r,
    () => ({ data: null, error: { message: "network" } }),
  );
  if (error) return NextResponse.json({ error: "Gagal terhubung ke database. Cek koneksi internet." }, { status: 502 });
  if (!data) return NextResponse.json({ error: "Layar tidak terdaftar" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
