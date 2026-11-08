import type { Menu } from "@/lib/types";

type Props = {
  menu: Pick<Menu, "nama" | "emoji" | "warna" | "panas" | "foto_url">;
  size?: "" | "sm" | "md" | "xl";
};

/** Foto menu kalau ada; kalau belum, ilustrasi piring di atas taplak. */
export default function FoodArt({ menu, size = "" }: Props) {
  if (menu.foto_url) {
    return (
      <span className={`art photo ${size}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={menu.foto_url} alt={`Foto ${menu.nama}`} />
      </span>
    );
  }
  return (
    <span className={`art ${size} pop-${menu.warna}`}>
      {menu.panas && (
        <span className="steam" aria-hidden="true"><i /><i /><i /></span>
      )}
      <span className="plate"><span className="food">{menu.emoji}</span></span>
    </span>
  );
}

export function Thumb({ menu }: { menu: Pick<Menu, "emoji" | "foto_url"> }) {
  return (
    <span className="emo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {menu.foto_url ? <img src={menu.foto_url} alt="" /> : menu.emoji}
    </span>
  );
}
