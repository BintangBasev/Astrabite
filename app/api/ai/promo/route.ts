import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { aiErrorResponse, describeAiError, gemini, jsonFormat, MAX_TOKENS, MODEL, outputText, parseJson, PERSONA, SEARCH_TOOLS } from "@/lib/ai";
import { loadCore, loadPeakHour } from "@/lib/data";
import { hpp } from "@/lib/menu-math";
import { rp } from "@/lib/format";

export const maxDuration = 60;

const Body = z.object({
  menu_id: z.string().uuid(),
  platform: z.enum(["ig", "reels", "tiktok", "wa", "fb"]),
  tujuan: z.enum(["promo", "baru", "sepi", "testi"]),
  gaya: z.enum(["genz", "fomo", "santai", "premium"]),
  diskon: z.number().int().min(0).max(90),
  variasi: z.number().int().min(0).max(50).default(0),
});

const Konten = z.object({
  hooks: z.array(z.string()),
  caption: z.string(),
  hashtags: z.array(z.string()),
  script: z.array(z.object({ waktu: z.string(), visual: z.string(), audio: z.string() })),
});

const PLATFORM: Record<string, string> = {
  ig: "Instagram Feed (foto kotak)", reels: "Instagram Reels (video vertikal 15 detik)",
  tiktok: "TikTok (video vertikal 15 detik)", wa: "WhatsApp Status / Broadcast (tanpa hashtag)", fb: "Facebook Page",
};
const TUJUAN: Record<string, string> = {
  promo: "promo diskon", baru: "kenalin menu baru", sepi: "ramaikan jam sepi (happy hour 14.00-16.00)", testi: "testimoni pelanggan",
};
const GAYA: Record<string, string> = {
  genz: "Gen Z lucu, relate, pakai slang", fomo: "FOMO / urgent, bikin pengen beli sekarang",
  santai: "santai dan hangat", premium: "premium aesthetic, kalem, kalimat pendek",
};

export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Harus login dulu" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data form tidak lengkap" }, { status: 400 });
  const b = parsed.data;

  const [{ menus, ings, recipes, settings }, peak] = await Promise.all([loadCore(supabase), loadPeakHour(supabase)]);
  const menu = menus.find((m) => m.id === b.menu_id);
  if (!menu) return NextResponse.json({ error: "Menu tidak ditemukan" }, { status: 404 });

  const pakaiDiskon = b.tujuan === "promo" || b.tujuan === "sepi";
  const diskon = pakaiDiskon ? b.diskon : 0;
  const hargaPromo = diskon ? Math.round((menu.harga * (100 - diskon)) / 10000) * 100 : menu.harga;
  const kode = diskon ? menu.nama.split(" ")[0].toUpperCase().slice(0, 8) + diskon : null;
  const modal = hpp(menu.id, recipes, ings);
  const margin = hargaPromo ? 1 - modal / hargaPromo : 0;
  const maxDiskon = Math.max(0, Math.floor(((1 - modal / (0.55 * menu.harga)) * 100) / 5) * 5);
  const video = b.platform === "reels" || b.platform === "tiktok";
  const { data: laku } = await supabase
    .from("order_items").select("qty, orders!inner(created_at)").eq("menu_id", menu.id)
    .gte("orders.created_at", new Date(Date.now() - 7 * 864e5).toISOString());
  const terjual7 = (laku ?? []).reduce((s, x) => s + x.qty, 0);

  const brief = [
    `Toko: ${settings.nama_toko}. Instagram: @${settings.instagram || "-"}, TikTok: @${settings.tiktok || "-"}, WhatsApp: ${settings.whatsapp || "-"}.`,
    `Menu: ${menu.nama} (${menu.kategori}). Harga normal ${rp(menu.harga)}.`,
    diskon ? `Diskon ${diskon}% jadi ${rp(hargaPromo)}, kode promo ${kode} (disebut di kasir).` : "Tanpa diskon.",
    `Terjual ${terjual7} porsi dalam 7 hari terakhir.`,
    `Platform: ${PLATFORM[b.platform]}. Tujuan: ${TUJUAN[b.tujuan]}. Gaya bahasa: ${GAYA[b.gaya]}.`,
    `Variasi ke-${b.variasi + 1}: bikin hook yang beda dari variasi sebelumnya.`,
  ].join("\n");

  try {
    const system =
      PERSONA +
      " Sekarang tugasmu jadi copywriter sosmed. Tulis dalam Bahasa Indonesia yang natural. " +
      "Boleh pakai Google Search buat cek tren, sound, atau hashtag kuliner yang lagi rame di Indonesia minggu ini. " +
      "hooks: tepat 3 kalimat pembuka yang bikin orang berhenti scroll (maks 90 karakter). " +
      "caption: isi caption lengkap TANPA hook dan TANPA hashtag: deskripsi rasa yang menggugah, info harga/kode promo, lalu ajakan order sesuai platform. " +
      "hashtags: 5-8 hashtag relevan berawalan #, kosongkan untuk WhatsApp. " +
      "script: untuk video isi 4 adegan (0-3 dtk, 3-7 dtk, 7-11 dtk, 11-15 dtk) dengan visual dan audio/teks layar; untuk platform non-video kosongkan. " +
      "Jangan mengarang testimoni dengan nama orang; jangan menjanjikan hal yang tidak ada di brief. Jawab hanya JSON sesuai skema.";
    const base = {
      model: MODEL,
      system_instruction: system,
      input: brief,
      response_format: jsonFormat(Konten),
      generation_config: { max_output_tokens: MAX_TOKENS, thinking_level: "medium" },
    };
    // Google Search dipakai kalau tersedia; kalau kombinasi dengan output JSON ditolak, ulang tanpa search.
    const it = SEARCH_TOOLS.length
      ? await gemini().interactions.create({ ...base, tools: SEARCH_TOOLS }).catch((e: { status?: number }) => {
          // Kombinasi search + JSON ditolak (400) atau kuota search habis (429): ulang tanpa search.
          if (e?.status === 400 || e?.status === 429) return gemini().interactions.create(base);
          throw e;
        })
      : await gemini().interactions.create(base);
    const out = parseJson(Konten, outputText(it));
    if (!out) {
      return NextResponse.json({ error: "Astro nggak bisa bikin konten ini. Coba lagi atau ganti pilihan." }, { status: 422 });
    }
    return NextResponse.json({
      ...out,
      script: video ? out.script : [],
      hashtags: b.platform === "wa" ? [] : out.hashtags,
      diskon,
      harga_promo: hargaPromo,
      kode,
      margin: Math.round(margin * 100),
      max_diskon: maxDiskon,
      jam_terbaik: b.tujuan === "sepi" ? "13:00" : `${String(Math.max(7, peak - 1)).padStart(2, "0")}:30`,
      jam_ramai: peak,
    });
  } catch (e) {
    console.error("[ai] gagal memanggil Gemini", e);
    const r = aiErrorResponse(e);
    return NextResponse.json({ error: describeAiError(e) }, { status: r.status });
  }
}
