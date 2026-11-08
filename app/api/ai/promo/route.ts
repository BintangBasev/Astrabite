import { NextResponse } from "next/server";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { requireUser } from "@/lib/supabase/server";
import { anthropic, aiErrorResponse, FALLBACK, MODEL, PERSONA } from "@/lib/ai";
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
    const res = await anthropic().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      output_config: { effort: "medium", format: betaZodOutputFormat(Konten) },
      system:
        PERSONA +
        " Sekarang tugasmu jadi copywriter sosmed. Tulis dalam Bahasa Indonesia yang natural. " +
        "hooks: tepat 3 kalimat pembuka yang bikin orang berhenti scroll (maks 90 karakter). " +
        "caption: isi caption lengkap TANPA hook dan TANPA hashtag: deskripsi rasa yang menggugah, info harga/kode promo, lalu ajakan order sesuai platform. " +
        "hashtags: 5-8 hashtag relevan berawalan #, kosongkan untuk WhatsApp. " +
        "script: untuk video isi 4 adegan (0-3 dtk, 3-7 dtk, 7-11 dtk, 11-15 dtk) dengan visual dan audio/teks layar; untuk platform non-video kosongkan. " +
        "Jangan mengarang testimoni dengan nama orang; jangan menjanjikan hal yang tidak ada di brief.",
      messages: [{ role: "user", content: brief }],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) {
      return NextResponse.json({ error: "Astro nggak bisa bikin konten ini. Coba ganti pilihan." }, { status: 422 });
    }
    const out = res.parsed_output;
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
    return aiErrorResponse(e);
  }
}
