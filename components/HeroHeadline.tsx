// Home hero headline: "The future / of your business / is (fingerprint) human + (spark) AI".
// The fingerprint fills with light from its centre outwards and fades back; the spark turns and sheds specks.
// Pure SVG + CSS (see .hero-v2 in globals.css), so it renders on the server and costs no JavaScript.

// Fingerprint ridges: tall, nearly closed ovals around (24, 28) that open towards the bottom, each ring
// opening at a slightly different place, with the outer ones running on down like the base of a finger.
const RIDGES = Array.from({ length: 7 }, (_, k) => {
  const rx = 2.2 + k * 3, ry = 3 + k * 3.45, cx = 24, cy = 28;
  const deg = (d: number) => (d * Math.PI) / 180;
  const a0 = deg(250 - k * 3), a1 = deg(-62 + (k % 2) * 26 - k * 2);
  const p = (a: number) => `${(cx + rx * Math.cos(a)).toFixed(2)} ${(cy - ry * Math.sin(a)).toFixed(2)}`;
  const tail = k > 1 ? ` q ${(-0.4 - k * 0.2).toFixed(2)} ${(1.6 + k * 0.5).toFixed(2)} ${(-1.6 - k * 0.3).toFixed(2)} ${(2.6 + k * 0.8).toFixed(2)}` : "";
  return `M${p(a0)} A${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 1 ${p(a1)}${tail}`;
});

function Fingerprint() {
  return (
    <svg className="hero-fp" viewBox="0 0 48 56" aria-hidden="true">
      {RIDGES.map((d, i) => (
        <path key={i} d={d} style={{ "--k": i } as React.CSSProperties} />
      ))}
    </svg>
  );
}

function Spark() {
  return (
    <span className="hero-spark" aria-hidden="true">
      <svg viewBox="0 0 48 48">
        <defs>
          <linearGradient id="hero-spark-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5ef2d6" />
            <stop offset="1" stopColor="#c8ff3d" />
          </linearGradient>
        </defs>
        <path d="M24 2 C26 17 31 22 46 24 C31 26 26 31 24 46 C22 31 17 26 2 24 C17 22 22 17 24 2 Z" fill="url(#hero-spark-fill)" />
      </svg>
      {Array.from({ length: 6 }, (_, i) => <i key={i} style={{ "--s": i } as React.CSSProperties} />)}
    </span>
  );
}

export function HeroHeadline() {
  return (
    <h1 className="hero-title" aria-label="The future of your business is human plus AI" data-roll="">
      <span className="roll"><span>The future</span></span>
      <span className="roll"><span>of your business</span></span>
      <span className="roll">
        <span>
          is <Fingerprint /><b>human</b> + <Spark /><b>AI</b>
        </span>
      </span>
    </h1>
  );
}
