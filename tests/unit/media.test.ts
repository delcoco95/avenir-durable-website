import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let dir: string;
beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "ad-media-"));
  process.env.UPLOAD_DIR = dir;
});
afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("traitement des images téléversées", () => {
  it("convertit en WebP, génère les variantes et supprime les métadonnées", async () => {
    const { processImage, variantPath } = await import("@/lib/media");
    const jpeg = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#2f7a34" } })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: "secret", ImageDescription: "GPS 48.85,2.35" } } })
      .toBuffer();
    const res = await processImage(jpeg);
    expect(res.mime).toBe("image/webp");
    expect(res.width).toBe(2000);
    for (const v of ["full", "md", "thumb"] as const) {
      const meta = await sharp(await fs.readFile(variantPath(res.storageKey, v))).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.exif).toBeUndefined();
    }
  });

  it("refuse un fichier qui n'est pas une image (même renommé)", async () => {
    const { processImage, UploadError } = await import("@/lib/media");
    await expect(processImage(Buffer.from("<?php system($_GET['c']); ?>"))).rejects.toBeInstanceOf(UploadError);
    await expect(processImage(Buffer.from("MZ\x90\x00\x03"))).rejects.toBeInstanceOf(UploadError);
  });

  it("refuse le SVG (risque de script)", async () => {
    const { processImage, UploadError } = await import("@/lib/media");
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><script>alert(1)</script><rect width="100" height="100"/></svg>');
    await expect(processImage(svg)).rejects.toBeInstanceOf(UploadError);
  });

  it("refuse un fichier vide ou trop volumineux", async () => {
    const { processImage, UploadError, MAX_UPLOAD_BYTES } = await import("@/lib/media");
    await expect(processImage(Buffer.alloc(0))).rejects.toBeInstanceOf(UploadError);
    await expect(processImage(Buffer.alloc(MAX_UPLOAD_BYTES + 1))).rejects.toBeInstanceOf(UploadError);
  });

  it("refuse une clé de stockage forgée (traversée de répertoire)", async () => {
    const { variantPath } = await import("@/lib/media");
    expect(() => variantPath("../../etc/passwd", "full")).toThrow();
  });
});
