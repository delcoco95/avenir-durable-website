import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/work-sans/index.css";
import "@/styles/tokens.css";
import "@/styles/site.css";
import { getSettings } from "@/lib/settings";
import { getMediaMap } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const og = (await getMediaMap([s.seo.ogImageId])).get(s.seo.ogImageId ?? -1);
  const indexable = process.env.ALLOW_INDEXING === "true" && !s.seo.preproduction;
  return {
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
    title: { default: s.seo.defaultTitle, template: s.seo.titleTemplate || "%s" },
    description: s.seo.defaultDescription,
    applicationName: s.identity.siteName,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false, nocache: true },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: s.identity.siteName,
      title: s.seo.defaultTitle,
      description: s.seo.defaultDescription,
      images: og ? [{ url: og.src, width: og.width, height: og.height, alt: og.alt }] : undefined,
    },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#f7f9f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
