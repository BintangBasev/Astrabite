import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";

/** Model Gemini yang dipakai semua fitur AI. */
export const MODEL = "gemini-3.8-flash";
export const MAX_TOKENS = 65536;

let _client: GoogleGenAI | null = null;
export function gemini() {
  // GEMINI_API_KEY diset di environment variable Vercel (hanya di server).
  _client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return _client;
}

type Interaction = Awaited<ReturnType<ReturnType<typeof gemini>["interactions"]["get"]>>;

/** Ambil teks jawaban model dari hasil interaction. */
export function outputText(it: unknown): string {
  const x = it as { output_text?: string; steps?: { type: string; content?: { type: string; text?: string }[] }[] };
  if (x.output_text) return x.output_text;
  return (x.steps ?? [])
    .filter((s) => s.type === "model_output")
    .flatMap((s) => s.content ?? [])
    .map((c) => (c.type === "text" ? c.text ?? "" : ""))
    .join("")
    .trim();
}

/** Format respons JSON terstruktur dari skema Zod. */
export function jsonFormat(schema: z.ZodType) {
  const { $schema: _drop, ...json } = z.toJSONSchema(schema) as Record<string, unknown>;
  void _drop;
  return { type: "text" as const, mime_type: "application/json", schema: json };
}

/** Parse JSON keluaran model lalu validasi dengan skema. null kalau gagal. */
export function parseJson<T>(schema: z.ZodType<T>, text: string): T | null {
  const raw = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  try {
    const r = schema.safeParse(JSON.parse(raw));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export type { Interaction };

/** Penjelasan singkat error AI dalam bahasa manusia (aman ditampilkan ke pemilik toko). */
export function describeAiError(e: unknown): string {
  if (!process.env.GEMINI_API_KEY) return "GEMINI_API_KEY belum diset di Vercel (Settings → Environment Variables), lalu Redeploy.";
  const err = e as { status?: number; statusCode?: number; message?: string; error?: { message?: string } };
  const status = err.status ?? err.statusCode;
  const msg = (err.error?.message ?? err.message ?? String(e)).slice(0, 300);
  if (status === 401 || status === 403) return `GEMINI_API_KEY salah atau tidak punya akses (${status}). ${msg}`;
  if (status === 404) return `Model ${MODEL} tidak ditemukan untuk key ini (404). ${msg}`;
  if (status === 429) return `Kuota Gemini habis atau terlalu banyak permintaan (429). ${msg}`;
  return status ? `Gemini error ${status}: ${msg}` : msg;
}

export function aiErrorResponse(e: unknown) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY belum diset di Vercel." }, { status: 500 });
  }
  const err = e as { status?: number; statusCode?: number; message?: string };
  const status = err.status ?? err.statusCode;
  if (status === 401 || status === 403) return NextResponse.json({ error: "GEMINI_API_KEY salah atau tidak punya akses." }, { status: 500 });
  if (status === 429) return NextResponse.json({ error: "Astro lagi kebanjiran permintaan. Coba lagi sebentar." }, { status: 429 });
  if (status === 400) return NextResponse.json({ error: "Permintaan ke AI ditolak: " + (err.message ?? "") }, { status: 400 });
  if (status) return NextResponse.json({ error: `AI error (${status}). Coba lagi.` }, { status: 502 });
  return NextResponse.json({ error: err.message ?? "Terjadi kesalahan" }, { status: 500 });
}

export const PERSONA =
  "Kamu adalah Astro, asisten AI di aplikasi AstraBite by Astratech untuk UMKM makanan di Indonesia. " +
  "Gaya bahasamu santai ala Gen Z (pakai 'gue/lo' atau 'Bos'), ramah, to the point, boleh pakai emoji secukupnya. " +
  "Untuk angka toko, selalu berdasarkan data yang diberikan; kalau datanya nggak ada, bilang terus terang dan jangan mengarang angka. " +
  "Format uang dalam Rupiah (contoh: Rp18.000).";
