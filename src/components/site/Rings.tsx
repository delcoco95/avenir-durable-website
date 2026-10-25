/**
 * Cernes de croissance : anneaux concentriques irréguliers, comme la coupe
 * d'un tronc de chêne. Signature graphique du site (croissance, temps long,
 * cycles naturels). Tracés déterministes pour un rendu stable côté serveur.
 */

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function ringPath(cx: number, cy: number, r: number, wobble: number, seed: number, points = 14) {
  const rand = seeded(seed);
  const pts: [number, number][] = [];
  const phase = rand() * Math.PI * 2;
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2 + phase;
    const rr = r * (1 + (rand() - 0.5) * wobble);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  // Courbe fermée lissée (Catmull-Rom → Bézier)
  let d = `M ${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`;
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % points]!;
    const p3 = pts[(i + 2) % points]!;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]!.toFixed(1)} ${c1[1]!.toFixed(1)}, ${c2[0]!.toFixed(1)} ${c2[1]!.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + " Z";
}

export function Rings({
  count = 9,
  className,
  seed = 7,
  accentIndex,
  start = 70,
  step = 26,
}: {
  count?: number;
  className?: string;
  seed?: number;
  accentIndex?: number;
  start?: number;
  step?: number;
}) {
  const size = start * 2 + step * 2 * count + 40;
  const c = size / 2;
  return (
    <svg className={className} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
      {Array.from({ length: count }, (_, i) => (
        <path
          key={i}
          className={`ring${i === accentIndex ? " ring--accent" : ""}`}
          pathLength={1}
          style={{ ["--i" as string]: i }}
          d={ringPath(c, c, start + i * step, 0.06 + i * 0.006, seed + i * 31)}
        />
      ))}
    </svg>
  );
}

/** Pictogrammes des domaines : une graine en orbite autour de cernes. */
export const DOMAIN_ICONS = ["leaf", "seed", "water", "hands", "sun", "cycle", "home", "spark"] as const;
export type DomainIcon = (typeof DOMAIN_ICONS)[number];

export function DomainGlyph({ icon }: { icon: string }) {
  const center: Record<string, React.ReactNode> = {
    leaf: <path d="M32 40c-6-2-9-8-7-15 7-1 13 2 15 8-1 4-4 7-8 7zm0 0v6" />,
    seed: <path d="M32 24c5 0 8 4 8 9s-4 10-8 10-8-5-8-10 3-9 8-9zm-6 6h12" />,
    water: <path d="M32 22c4 6 8 10 8 15a8 8 0 0 1-16 0c0-5 4-9 8-15z" />,
    hands: <path d="M22 36c3 0 5 2 7 4h6c3 0 4-3 2-4l-5-1m-10 1v8m20-10 4-4" />,
    sun: <path d="M32 27a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0-6v3m0 18v3m-11-12h3m18 0h3" />,
    cycle: <path d="M24 33a8 8 0 0 1 14-5m2 5a8 8 0 0 1-14 5m12-12v3h-3m-9 12v-3h3" />,
    home: <path d="M23 33 32 25l9 8m-15-2v9h12v-9" />,
    spark: <path d="M32 23v20m-10-10h20m-17-7 14 14m0-14L25 40" />,
  };
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="29" opacity="0.25" />
      <circle cx="32" cy="32" r="22" opacity="0.4" />
      <g className="orbit">
        <circle cx="32" cy="3" r="3" fill="var(--accent)" stroke="none" />
      </g>
      {center[icon] ?? center.leaf}
    </svg>
  );
}

export function Sprout() {
  return (
    <svg className="btn__sprout" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M3 10h12m-4-4 4 4-4 4" />
    </svg>
  );
}

export function ValueGlyph() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="14" opacity="0.35" />
      <circle cx="16" cy="16" r="9" opacity="0.6" />
      <circle cx="16" cy="16" r="3.5" fill="currentColor" />
    </svg>
  );
}

export function VineDivider() {
  return (
    <svg className="divider-vine" data-reveal-self viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path pathLength={1} d="M0 20 C 150 4, 250 36, 400 20 S 650 4, 800 20 S 1050 36, 1200 20" />
    </svg>
  );
}
