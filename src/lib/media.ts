import fs from "node:fs/promises";
import path from "node:path";
import sharp, { type Metadata as SharpMetadata } from "sharp";
import { randomToken } from "@/lib/security/crypto";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 Mo
export const MAX_PIXELS = 50_000_000; // ~ 50 mégapixels
export const ACCEPTED_FORMATS = ["jpeg", "png", "webp", "avif", "gif"] as const;
export const ACCEPT_ATTR = "image/jpeg,image/png,image/webp,image/avif,image/gif";

/** Variantes générées pour chaque image (format WebP, optimisé pour le web). */
export const VARIANTS = {
  full: 2000,
  md: 1200,
  thumb: 480,
} as const;
export type Variant = keyof typeof VARIANTS;

export function uploadDir() {
  return path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");
}

export function variantPath(storageKey: string, variant: Variant) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(storageKey)) throw new Error("Clé de stockage invalide");
  return path.join(uploadDir(), `${storageKey}-${variant}.webp`);
}

export class UploadError extends Error {}

/**
 * Valide et optimise une image téléversée.
 * - Le format est déterminé par le contenu réel du fichier (et non par son nom
 *   ou le type annoncé par le navigateur) : les fichiers SVG, exécutables ou
 *   scripts sont refusés.
 * - L'image est ré-encodée en WebP (ce qui supprime toute charge utile cachée et
 *   les métadonnées EXIF, dont la géolocalisation).
 */
export async function processImage(buffer: Buffer) {
  if (buffer.length === 0) throw new UploadError("Le fichier est vide.");
  if (buffer.length > MAX_UPLOAD_BYTES) throw new UploadError("Le fichier dépasse la taille maximale de 10 Mo.");

  let meta: SharpMetadata;
  try {
    meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw new UploadError("Ce fichier n'est pas une image valide (formats acceptés : JPEG, PNG, WebP, AVIF, GIF).");
  }
  if (!meta.format || !(ACCEPTED_FORMATS as readonly string[]).includes(meta.format)) {
    throw new UploadError("Format non autorisé. Formats acceptés : JPEG, PNG, WebP, AVIF, GIF.");
  }
  if (!meta.width || !meta.height) throw new UploadError("Dimensions de l'image illisibles.");
  if (meta.width < 16 || meta.height < 16) throw new UploadError("L'image est trop petite.");

  const storageKey = randomToken(18);
  await fs.mkdir(uploadDir(), { recursive: true });

  let width = meta.width;
  let height = meta.height;
  let total = 0;
  for (const [variant, max] of Object.entries(VARIANTS) as [Variant, number][]) {
    const out = await sharp(buffer, { limitInputPixels: MAX_PIXELS, animated: false })
      .rotate() // applique l'orientation EXIF avant suppression des métadonnées
      .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
      .webp({ quality: variant === "thumb" ? 72 : 80, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    await fs.writeFile(variantPath(storageKey, variant), out.data, { mode: 0o640 });
    if (variant === "full") {
      width = out.info.width;
      height = out.info.height;
      total = out.data.length;
    }
  }
  return { storageKey, width, height, size: total, mime: "image/webp" };
}

export async function deleteStoredImage(storageKey: string) {
  for (const variant of Object.keys(VARIANTS) as Variant[]) {
    await fs.rm(variantPath(storageKey, variant), { force: true });
  }
}

/** Nom de fichier d'origine nettoyé (affichage uniquement). */
export function cleanFileName(name: string) {
  return name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 200) || "image";
}
