import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCore, loadDaily, loadToday, loadUsage } from "./data";
import { hargaJual, hpp } from "./menu-math";
import { HARI_PANJANG, hariIniWib } from "./format";

/** Ringkasan data toko dalam bentuk JSON, buat konteks Astro (asisten AI). */
export async function buildSnapshot(sb: SupabaseClient) {
  const [core, today, daily, usage] = await Promise.all([loadCore(sb), loadToday(sb), loadDaily(sb, 14), loadUsage(sb)]);
  const { menus, ings, recipes, promos, settings } = core;
  const tgl = hariIniWib();
  const hari = HARI_PANJANG[new Date(tgl + "T12:00:00+07:00").getDay()];
  const nama = (id: string) => menus.find((m) => m.id === id)?.nama ?? "?";

  return {
    toko: settings.nama_toko,
    hari_ini: `${hari}, ${tgl}`,
    target_harian: settings.target_harian,
    penjualan_hari_ini: {
      omzet: today.omzet,
      transaksi: today.orders.length,
      hpp_terpakai: today.modal,
      pengeluaran: today.keluar,
      untung_bersih: today.bersih,
      per_menu: today.top.map(([id, q]) => ({ menu: nama(id), porsi: q })),
    },
    omzet_14_hari: daily.map((d) => ({ tanggal: d.tanggal, omzet: d.omzet, transaksi: d.trx, hpp: d.modal })),
    menu: menus.filter((m) => m.aktif).map((m) => {
      const h = Math.round(hpp(m.id, recipes, ings));
      return {
        nama: m.nama,
        kategori: m.kategori,
        harga: m.harga,
        harga_jual_sekarang: hargaJual(m, promos),
        hpp: h,
        margin_persen: m.harga ? Math.round((1 - h / m.harga) * 100) : 0,
        resep: recipes.filter((r) => r.menu_id === m.id).map((r) => {
          const i = ings.find((x) => x.id === r.ingredient_id);
          return `${i?.nama} ${r.qty} ${i?.satuan}`;
        }),
      };
    }),
    stok_bahan: ings.map((i) => ({
      nama: i.nama,
      stok: i.stok,
      satuan: i.satuan,
      stok_minimum: i.stok_min,
      harga_per_satuan: i.harga_per_satuan,
      pemakaian_per_hari: Math.round((usage[i.id] ?? 0) * 10) / 10,
      perkiraan_habis_hari: usage[i.id] ? Math.round((i.stok / usage[i.id]) * 10) / 10 : null,
    })),
    promo_aktif: promos.filter((p) => p.aktif).map((p) => ({ menu: nama(p.menu_id), diskon_persen: p.diskon, kode: p.kode, dipakai: p.dipakai })),
    pengeluaran_hari_ini: today.expenses.map((e) => ({ kategori: e.kategori, keterangan: e.keterangan, nominal: e.nominal })),
  };
}
