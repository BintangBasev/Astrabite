export const PLAT = {
  ig: { n: "Instagram Feed", s: "IG", c: "linear-gradient(135deg,#FEDA75,#D62976 55%,#4F5BD5)", vid: false },
  reels: { n: "IG Reels", s: "IG", c: "linear-gradient(135deg,#FEDA75,#D62976 55%,#4F5BD5)", vid: true },
  tiktok: { n: "TikTok", s: "TT", c: "linear-gradient(135deg,#25F4EE,#121212 50%,#FE2C55)", vid: true },
  wa: { n: "WA Status / Broadcast", s: "WA", c: "linear-gradient(135deg,#25D366,#128C7E)", vid: false },
  fb: { n: "Facebook", s: "FB", c: "linear-gradient(135deg,#4A8CFF,#1877F2)", vid: false },
} as const;
export type PlatKey = keyof typeof PLAT;

export const GRAD: Record<string, string> = {
  pink: "linear-gradient(160deg,#FFD9CF,#FF8A6B)", sun: "linear-gradient(160deg,#FFF0C2,#FFC93C)",
  sky: "linear-gradient(160deg,#FFE3C7,#FF9F4A)", lime: "linear-gradient(160deg,#E8F5DA,#9CCB72)",
  violet: "linear-gradient(160deg,#F3E2D2,#C58A5A)",
};
