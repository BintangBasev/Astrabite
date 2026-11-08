import { NextResponse } from "next/server";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { requireUser } from "@/lib/supabase/server";
import { anthropic, aiErrorResponse, FALLBACK, MODEL } from "@/lib/ai";

export const maxDuration = 60;

const NotaSchema = z.object({
  toko: z.string().nullable(),
  total: z.number().int(),
  items: z.array(
    z.object({
      teks: z.string(),
      harga: z.number().int(),
      ingredient_id: z.string().nullable(),
      qty_stok: z.number().nullable(),
    }),
  ),
});

const TIPE = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type Tipe = (typeof TIPE)[number];

export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Harus login dulu" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("nota");
  if (!(file instanceof File)) return NextResponse.json({ error: "Foto nota belum dipilih" }, { status: 400 });
  if (!TIPE.includes(file.type as Tipe)) return NextResponse.json({ error: "Format foto harus JPG, PNG, WEBP, atau GIF" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Foto maksimal 5 MB" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type.split("/")[1];
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from("nota").upload(path, bytes, { contentType: file.type });
  if (up.error) return NextResponse.json({ error: "Gagal simpan foto nota: " + up.error.message }, { status: 500 });

  const { data: ings } = await supabase.from("ingredients").select("id, nama, satuan").order("nama");
  const daftar = (ings ?? []).map((i) => `- id=${i.id} | ${i.nama} | satuan stok: ${i.satuan}`).join("\n");

  try {
    const res = await anthropic().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      output_config: { effort: "medium", format: betaZodOutputFormat(NotaSchema) },
      system:
        "Kamu membaca foto nota belanja bahan baku milik UMKM makanan di Indonesia. " +
        "Ambil setiap baris barang beserta harganya (dalam Rupiah, bilangan bulat tanpa titik). " +
        "Cocokkan tiap barang ke daftar bahan toko kalau jelas sama (pakai id-nya), dan ubah jumlahnya ke satuan stok bahan itu " +
        "(contoh: telur 1 kg kira-kira 16 butir, cabai 1/2 kg = 500 gr, susu 1L x2 = 2000 ml). " +
        "Kalau barangnya tidak ada di daftar atau jumlahnya tidak terbaca, isi ingredient_id dan qty_stok dengan null. " +
        "total = total yang tertulis di nota, atau jumlah semua harga kalau tidak tertulis.",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: file.type as Tipe, data: bytes.toString("base64") } },
            { type: "text", text: `Daftar bahan toko:\n${daftar}\n\nBaca nota ini.` },
          ],
        },
      ],
    });

    if (res.stop_reason === "refusal" || !res.parsed_output) {
      return NextResponse.json({ error: "Astro nggak bisa baca nota ini. Coba foto ulang yang lebih jelas." }, { status: 422 });
    }
    const valid = new Set((ings ?? []).map((i) => i.id));
    const out = res.parsed_output;
    out.items = out.items.map((it) =>
      it.ingredient_id && valid.has(it.ingredient_id) ? it : { ...it, ingredient_id: null, qty_stok: null },
    );
    return NextResponse.json({ ...out, nota_path: path });
  } catch (e) {
    return aiErrorResponse(e);
  }
}
