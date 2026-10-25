import { notFound } from "next/navigation";
import { getPublishedPage } from "@/lib/content";
import { pageMetadata } from "@/lib/page-meta";
import { Sections } from "@/components/site/Sections";

export async function generateMetadata() {
  const page = await getPublishedPage("accueil");
  return page ? pageMetadata(page.content, "/") : {};
}

export default async function HomePage() {
  const page = await getPublishedPage("accueil");
  if (!page) notFound();
  return <Sections sections={page.content.sections} pageTitle={page.content.title} />;
}
