import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Politique de sécurité du contenu : aucun script tiers n'est chargé par défaut.
// Les services facultatifs (statistiques, vidéos…) ne sont injectés qu'après
// consentement ; leurs domaines doivent alors être autorisés via la variable
// CSP_EXTRA_SOURCES (liste séparée par des espaces, ex. "https://stats.exemple.fr").
const extra = (process.env.CSP_EXTRA_SOURCES ?? "")
  .split(/\s+/)
  .filter((s) => /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(s))
  .join(" ");
const plus = extra ? ` ${extra}` : "";
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (isProd ? "" : " 'unsafe-eval'") + plus,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:" + plus,
  "font-src 'self'",
  "connect-src 'self'" + plus,
  "frame-src 'self'" + plus,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["sharp", "@node-rs/argon2", "pg"],
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
