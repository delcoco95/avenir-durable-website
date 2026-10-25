import type { Metadata } from "next";
import type { PageContent } from "@/db/schema";
import { getMediaMap } from "./content";

export async function pageMetadata(content: PageContent, path: string): Promise<Metadata> {
  const og = content.ogImageId ? (await getMediaMap([content.ogImageId])).get(content.ogImageId) : undefined;
  const title = content.seoTitle || content.title;
  return {
    title: path === "/" ? { absolute: content.seoTitle || content.title } : title,
    description: content.seoDescription || undefined,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: content.seoDescription || undefined,
      url: path,
      images: og ? [{ url: og.src, width: og.width, height: og.height, alt: og.alt }] : undefined,
    },
  };
}
