import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { anthropic, aiErrorResponse, FALLBACK, MODEL, PERSONA } from "@/lib/ai";
import { buildSnapshot } from "@/lib/snapshot";
import { hariIniWib } from "@/lib/format";

export const maxDuration = 60;

/** Bikin (atau perbarui) Daily Log Astro untuk hari ini, simpan ke tabel ai_summaries. */
export async function POST() {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Harus login dulu" }, { status: 401 });
  try {
    const snapshot = await buildSnapshot(supabase);
    const res = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      ...FALLBACK,
      output_config: { effort: "low" },
      system:
        PERSONA +
        " Tulis Daily Log: tepat 4 poin pendek (masing-masing 1 kalimat, diawali '- '), isinya: menu terlaris, omzet vs kemarin/target, " +
        "bahan yang perlu dibeli, dan satu saran konkret buat besok. Tanpa judul, tanpa pembuka.",
      messages: [{ role: "user", content: "DATA TOKO (JSON):\n" + JSON.stringify(snapshot) }],
    });
    if (res.stop_reason === "refusal") return NextResponse.json({ error: "Astro nggak bisa bikin ringkasan sekarang." }, { status: 422 });
    const isi = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    const tanggal = hariIniWib();
    await supabase.from("ai_summaries").upsert({ tanggal, isi, created_at: new Date().toISOString() });
    return NextResponse.json({ isi });
  } catch (e) {
    return aiErrorResponse(e);
  }
}
