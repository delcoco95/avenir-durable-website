import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedDomain } from "@/lib/content";
import { plainText } from "@/lib/markdown";
import { SLUG_RE } from "@/lib/slug";
import { DomainView } from "@/components/site/DomainView";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return {};
  const d = await getPublishedDomain(slug);
  if (!d) return {};
  return { title: d.title, description: d.summary || plainText(d.body), alternates: { canonical: `/nos-actions/${slug}` } };
}

export default async function DomainPage({ params }: Props) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) notFound();
  const d = await getPublishedDomain(slug);
  if (!d) notFound();
  return <DomainView domain={d} />;
}
