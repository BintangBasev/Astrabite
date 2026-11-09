import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { aiErrorResponse, describeAiError, gemini, MAX_TOKENS, MODEL, PERSONA } from "@/lib/ai";
import { buildSnapshot } from "@/lib/snapshot";

export const maxDuration = 60;

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) })).min(1).max(40),
});

export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Harus login dulu" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pesan tidak valid" }, { status: 400 });

  let snapshot: unknown;
  try {
    snapshot = await buildSnapshot(supabase);
  } catch (e) {
    return aiErrorResponse(e);
  }

  const system =
    PERSONA +
    " Jawab pertanyaan pemilik toko soal penjualan, stok, menu, promo, dan pengeluaran dari DATA TOKO di bawah. " +
    "Google Search hanya untuk info luar toko (tren kuliner, harga bahan di pasar, ide promo); angka toko tetap dari data. " +
    "Jawaban singkat (maks ~120 kata), pakai poin kalau perlu, dan kasih saran yang bisa langsung dijalankan. " +
    "Format teks biasa: boleh pakai baris baru dan tanda '-' untuk poin, jangan pakai tabel atau heading markdown.\n\n" +
    "DATA TOKO TERKINI (JSON):\n" + JSON.stringify(snapshot);

  const input = parsed.data.messages.map((m) => ({
    type: m.role === "user" ? ("user_input" as const) : ("model_output" as const),
    content: [{ type: "text" as const, text: m.content }],
  }));

  try {
    const stream = await gemini().interactions.create({
      model: MODEL,
      system_instruction: system,
      input,
      tools: [{ type: "google_search" }],
      generation_config: { max_output_tokens: MAX_TOKENS, thinking_level: "low" },
      stream: true,
    });
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        let ada = false;
        try {
          for await (const ev of stream) {
            if (ev.event_type === "step.delta" && ev.delta.type === "text") {
              ada = true;
              controller.enqueue(enc.encode(ev.delta.text));
            } else if (ev.event_type === "error") {
              console.error("[chat] stream error event", ev.error);
              controller.enqueue(enc.encode(`\n\n⚠️ Astro error: ${ev.error?.message ?? "tidak diketahui"}`));
            }
          }
          if (!ada) controller.enqueue(enc.encode("Hmm, Astro belum nemu jawabannya. Coba tanya dengan kalimat lain ya."));
        } catch (e) {
          console.error("[chat] stream gagal", e);
          controller.enqueue(enc.encode(`\n\n⚠️ Astro error: ${describeAiError(e)}`));
        } finally {
          controller.close();
        }
      },
    });
    return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[chat] gagal memanggil Gemini", e);
    return NextResponse.json({ error: describeAiError(e) }, { status: 502 });
  }
}
