import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMediaMap, getPublishedProject } from "@/lib/content";
import { plainText } from "@/lib/markdown";
import { SLUG_RE } from "@/lib/slug";
import { ProjectView } from "@/components/site/ProjectView";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return {};
  const p = await getPublishedProject(slug);
  if (!p) return {};
  const cover = p.coverId ? (await getMediaMap([p.coverId])).get(p.coverId) : undefined;
  const description = p.seoDescription || p.summary || plainText(p.body);
  return {
    title: p.title,
    description,
    alternates: { canonical: `/projets/${slug}` },
    openGraph: { title: p.title, description, type: "article", images: cover ? [{ url: cover.src, width: cover.width, height: cover.height, alt: cover.alt }] : undefined },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) notFound();
  const p = await getPublishedProject(slug);
  if (!p) notFound();
  return <ProjectView project={p} />;
}
