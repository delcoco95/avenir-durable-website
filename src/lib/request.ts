import { headers } from "next/headers";

/**
 * Adresse IP du client. Derrière un proxy inverse (Nginx, Caddy…), configurez
 * celui-ci pour transmettre X-Forwarded-For / X-Real-IP.
 */
export async function clientIp() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "local";
}

export async function userAgent() {
  const h = await headers();
  return (h.get("user-agent") ?? "").slice(0, 300);
}
