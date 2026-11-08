import type { Ingredient, Menu, Promo, Recipe } from "./types";

export function hpp(menuId: string, recipes: Recipe[], ings: Ingredient[]) {
  return recipes
    .filter((r) => r.menu_id === menuId)
    .reduce((s, r) => s + r.qty * (ings.find((i) => i.id === r.ingredient_id)?.harga_per_satuan ?? 0), 0);
}

export function hargaJual(menu: Menu, promos: Promo[]) {
  const p = promos.find((x) => x.menu_id === menu.id && x.aktif);
  return p ? Math.round((menu.harga * (100 - p.diskon)) / 10000) * 100 : menu.harga;
}

/** Berapa porsi lagi yang bisa dibuat dari stok sekarang. */
export function porsiBisa(menuId: string, recipes: Recipe[], ings: Ingredient[]) {
  const rs = recipes.filter((r) => r.menu_id === menuId);
  if (!rs.length) return Infinity;
  return Math.min(
    ...rs.map((r) => Math.floor((ings.find((i) => i.id === r.ingredient_id)?.stok ?? 0) / r.qty)),
  );
}

/** Saran harga biar margin ±60%, dibulatkan ke Rp500. */
export const saranHarga = (h: number) => Math.ceil(h / 0.4 / 500) * 500;
