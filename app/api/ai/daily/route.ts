import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { aiErrorResponse, describeAiError, gemini, MAX_TOKENS, MODEL, outputText, PERSONA } from "@/lib/ai";
import { buildSnapshot } from "@/lib/snapshot";
import { hariIniWib } from "@/lib/format";

export const maxDuration = 60;

/** Bikin (atau perbarui) Daily Log Astro untuk hari ini, simpan ke tabel ai_summaries. */
export async function POST() {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Harus login dulu" }, { status: 401 });
  try {
    const snapshot = await buildSnapshot(supabase);
    const it = await gemini().interactions.create({
      model: MODEL,
      system_instruction:
        PERSONA +
        " Tulis Daily Log: tepat 4 poin pendek (masing-masing 1 kalimat, diawali '- '), isinya: menu terlaris, omzet vs kemarin/target, " +
        "bahan yang perlu dibeli, dan satu saran konkret buat besok. Tanpa judul, tanpa pembuka.",
      input: "DATA TOKO (JSON):\n" + JSON.stringify(snapshot),
      generation_config: { max_output_tokens: MAX_TOKENS, thinking_level: "low" },
    });
    const isi = outputText(it);
    if (!isi) return NextResponse.json({ error: "Astro nggak bisa bikin ringkasan sekarang." }, { status: 422 });
    await supabase.from("ai_summaries").upsert({ tanggal: hariIniWib(), isi, created_at: new Date().toISOString() });
    return NextResponse.json({ isi });
  } catch (e) {
    console.error("[ai] gagal memanggil Gemini", e);
    const r = aiErrorResponse(e);
    return NextResponse.json({ error: describeAiError(e) }, { status: r.status });
  }
}
