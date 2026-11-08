export function confetti() {
  if (typeof window === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let c = document.getElementById("fx") as HTMLCanvasElement | null;
  if (!c) {
    c = document.createElement("canvas");
    c.id = "fx";
    c.setAttribute("aria-hidden", "true");
    document.body.appendChild(c);
  }
  const x = c.getContext("2d");
  if (!x) return;
  const dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  x.scale(dpr, dpr);
  const cols = ["#E23D24", "#FF7A1A", "#FFC93C", "#2F8F4E", "#FFFFFF"];
  const P = Array.from({ length: 150 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight * 0.45,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 4,
    r: Math.random() * 6 + 4,
    c: cols[Math.floor(Math.random() * cols.length)],
    a: Math.random() * 6,
    s: Math.random() > 0.5,
  }));
  const t0 = performance.now();
  const frame = (t: number) => {
    x.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of P) {
      p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += 0.15;
      x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c;
      if (p.s) x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      else { x.beginPath(); x.arc(0, 0, p.r / 2.4, 0, 7); x.fill(); }
      x.restore();
    }
    if (t - t0 < 2400) requestAnimationFrame(frame);
    else x.clearRect(0, 0, innerWidth, innerHeight);
  };
  requestAnimationFrame(frame);
}
