import { notFound, permanentRedirect } from "next/navigation";
import { getPublishedPage } from "@/lib/content";
import { pageMetadata } from "@/lib/page-meta";
import { SLUG_RE } from "@/lib/slug";
import { Sections } from "@/components/site/Sections";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return {};
  const page = await getPublishedPage(slug);
  return page ? pageMetadata(page.content, `/${slug}`) : {};
}

export default async function GenericPage({ params }: Props) {
  const { slug } = await params;
  if (slug === "accueil") permanentRedirect("/");
  if (!SLUG_RE.test(slug)) notFound();
  const page = await getPublishedPage(slug);
  if (!page) notFound();
  return <Sections sections={page.content.sections} pageTitle={page.content.title} />;
}
