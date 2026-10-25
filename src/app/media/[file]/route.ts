import fs from "node:fs/promises";
import path from "node:path";
import { uploadDir } from "@/lib/media";

export const runtime = "nodejs";

/**
 * Distribution des images téléversées (stockées hors du dossier public).
 * Le nom de fichier est strictement validé : aucune traversée de répertoire
 * possible. Les fichiers sont immuables (nouvelle clé à chaque remplacement).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[A-Za-z0-9_-]{16,64}-(full|md|thumb)\.webp$/.test(file)) {
    return new Response("Introuvable", { status: 404 });
  }
  const full = path.join(uploadDir(), file);
  if (!full.startsWith(uploadDir() + path.sep)) return new Response("Introuvable", { status: 404 });
  try {
    const data = await fs.readFile(full);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
