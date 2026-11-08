/** Logo AstraBite + ikon garis, dipakai lewat <svg><use href="#..."/></svg>. */
export default function Sprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <symbol id="astro" viewBox="0 0 64 64">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#D9301A" />
            <stop offset=".6" stopColor="#FF7A1A" />
            <stop offset="1" stopColor="#FFC93C" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill="url(#lg)" />
        <ellipse cx="32" cy="34" rx="22" ry="8" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2.5" transform="rotate(-20 32 34)" />
        <path d="M32 14c1.6 9 4.4 11.8 13.4 13.4C36.4 29 33.6 31.8 32 40.8 30.4 31.8 27.6 29 18.6 27.4 27.6 25.8 30.4 23 32 14z" fill="#fff" />
        <circle cx="47" cy="44" r="3.4" fill="#FFF3D6" />
      </symbol>
      <symbol id="i-home" viewBox="0 0 24 24"><path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" /></symbol>
      <symbol id="i-kasir" viewBox="0 0 24 24"><path d="M5 7h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" /><path d="M9 7V6a3 3 0 0 1 6 0v1" /></symbol>
      <symbol id="i-stok" viewBox="0 0 24 24"><path d="M3 8l9-5 9 5v8l-9 5-9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></symbol>
      <symbol id="i-menu" viewBox="0 0 24 24"><path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1-3 4-3 7h3" /></symbol>
      <symbol id="i-promo" viewBox="0 0 24 24"><path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1z" /><path d="M17 9a4 4 0 0 1 0 6M19.5 6.5a7.5 7.5 0 0 1 0 11" /></symbol>
      <symbol id="i-tv" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8M12 17v4" /></symbol>
      <symbol id="i-cuan" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18M16 15h2" /><path d="M6 6V5a2 2 0 0 1 2-2h8" /></symbol>
      <symbol id="i-astro" viewBox="0 0 24 24"><path d="M12 3c.9 4.6 2.4 6.1 7 7-4.6.9-6.1 2.4-7 7-.9-4.6-2.4-6.1-7-7 4.6-.9 6.1-2.4 7-7z" /><path d="M19 17v4M17 19h4" /></symbol>
      <symbol id="i-camera" viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></symbol>
    </svg>
  );
}
