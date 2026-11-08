import { NextResponse } from "next/server";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/supabase/server";
import { anthropic, aiErrorResponse, FALLBACK, MODEL, PERSONA } from "@/lib/ai";
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

  const messages: Anthropic.Beta.BetaMessageParam[] = parsed.data.messages.map((m) => ({ role: m.role, content: m.content }));
  const system =
    PERSONA +
    " Jawab pertanyaan pemilik toko soal penjualan, stok, menu, promo, dan pengeluaran. " +
    "Jawaban singkat (maks ~120 kata), pakai poin kalau perlu, dan kasih saran yang bisa langsung dijalankan. " +
    "Format teks biasa: boleh pakai baris baru dan tanda '-' untuk poin, jangan pakai tabel atau heading markdown.\n\n" +
    "DATA TOKO TERKINI (JSON):\n" + JSON.stringify(snapshot);

  try {
    const stream = anthropic().beta.messages.stream({
      model: MODEL,
      max_tokens: 4000,
      ...FALLBACK,
      output_config: { effort: "low" },
      system,
      messages,
    });
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const ev of stream) {
            if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
              controller.enqueue(enc.encode(ev.delta.text));
            }
          }
          const final = await stream.finalMessage();
          if (final.stop_reason === "refusal") controller.enqueue(enc.encode("\n\nMaaf, yang ini gue nggak bisa bantu."));
          if (final.stop_reason === "max_tokens") controller.enqueue(enc.encode("…"));
        } catch {
          controller.enqueue(enc.encode("\n\n[Astro lagi error, coba tanya lagi ya]"));
        } finally {
          controller.close();
        }
      },
      cancel() {
        stream.abort();
      },
    });
    return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (e) {
    return aiErrorResponse(e);
  }
}
