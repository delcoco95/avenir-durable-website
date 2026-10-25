import { z } from "zod";
import { getDb, schema } from "@/db";
import { getSettings } from "@/lib/settings";
import { hitRateLimit } from "@/lib/auth/throttle";

export const runtime = "nodejs";

const body = z.object({
  v: z.string().max(20),
  id: z.string().uuid(),
  ts: z.number().int().positive(),
  choices: z.record(z.string().regex(/^[a-z0-9-]{2,30}$/), z.boolean()),
});

/**
 * Preuve de consentement : enregistre de façon anonyme (identifiant aléatoire
 * généré dans le navigateur, sans IP) la version de la politique et les choix.
 */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return new Response(null, { status: 403 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!(await hitRateLimit("consent", ip, 30, 60 * 60 * 1000))) return new Response(null, { status: 429 });

  const settings = await getSettings();
  const known = new Set(settings.cookies.services.map((s) => s.id));
  const choices = Object.fromEntries(Object.entries(parsed.data.choices).filter(([k]) => known.has(k)));
  await getDb().insert(schema.consentLogs).values({ consentId: parsed.data.id, choices, policyVersion: settings.cookies.policyVersion });
  return new Response(null, { status: 204 });
}
