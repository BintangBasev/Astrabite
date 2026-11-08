import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

/** Model Claude yang dipakai semua fitur AI. */
export const MODEL = "claude-opus-5-5";

/**
 * Fallback sisi server: kalau model menolak permintaan (refusal), API otomatis
 * mengulang di model lain dalam panggilan yang sama.
 */
export const FALLBACK = {
  betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[],
  fallbacks: "default" as const,
};

let _client: Anthropic | null = null;
export function anthropic() {
  // Baca ANTHROPIC_API_KEY dari environment (diset di Vercel).
  _client ??= new Anthropic();
  return _client;
}

export function aiErrorResponse(e: unknown) {
  if (e instanceof Anthropic.AuthenticationError) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY belum diset atau salah." }, { status: 500 });
  }
  if (e instanceof Anthropic.RateLimitError) {
    return NextResponse.json({ error: "Astro lagi kebanjiran permintaan. Coba lagi sebentar." }, { status: 429 });
  }
  if (e instanceof Anthropic.BadRequestError) {
    return NextResponse.json({ error: "Permintaan ke AI ditolak: " + e.message }, { status: 400 });
  }
  if (e instanceof Anthropic.APIError) {
    return NextResponse.json({ error: `AI error (${e.status ?? "?"}). Coba lagi.` }, { status: 502 });
  }
  const msg = e instanceof Error ? e.message : "Terjadi kesalahan";
  return NextResponse.json({ error: msg }, { status: 500 });
}

export const PERSONA =
  "Kamu adalah Astro, asisten AI di aplikasi AstraBite by Astratech untuk UMKM makanan di Indonesia. " +
  "Gaya bahasamu santai ala Gen Z (pakai 'gue/lo' atau 'Bos'), ramah, to the point, boleh pakai emoji secukupnya. " +
  "Selalu berdasarkan data yang diberikan; kalau datanya nggak ada, bilang terus terang dan jangan mengarang angka. " +
  "Format uang dalam Rupiah (contoh: Rp18.000).";
