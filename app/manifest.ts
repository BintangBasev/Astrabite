import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AstraBite by Astratech",
    short_name: "AstraBite",
    description: "Kasir, stok, promo, layar TV, dan asisten AI buat UMKM makanan.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF5EA",
    theme_color: "#E23D24",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
