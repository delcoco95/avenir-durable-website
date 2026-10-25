import type { MediaRef } from "@/lib/content";
import { VARIANTS } from "@/lib/media";

/** Image responsive (variantes WebP 480 / 1200 / 2000 px générées au téléversement). */
export function Picture({
  media,
  sizes = "100vw",
  priority = false,
  className,
  alt,
}: {
  media: MediaRef;
  sizes?: string;
  priority?: boolean;
  className?: string;
  alt?: string;
}) {
  const ratio = media.height / media.width;
  const w = (max: number) => Math.min(max, media.width);
  const srcSet = [
    `${media.srcThumb} ${w(VARIANTS.thumb)}w`,
    `${media.srcMd} ${w(VARIANTS.md)}w`,
    `${media.src} ${w(VARIANTS.full)}w`,
  ].join(", ");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={media.srcMd}
      srcSet={srcSet}
      sizes={sizes}
      width={media.width}
      height={Math.round(media.width * ratio)}
      alt={alt ?? media.alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}
