import { getMediaMap, getNavPages } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { mix } from "@/lib/color";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ConsentManager } from "./ConsentManager";
import { Reveal } from "./Reveal";

const DEFAULT_LOGO = { src: "/brand/logo-avenir-durable.webp", width: 389, height: 179 };

/** Habillage commun du site public : couleurs du thème, en-tête, pied de page, consentement. */
export async function SiteShell({ children }: { children: React.ReactNode }) {
  const [settings, nav] = await Promise.all([getSettings(), getNavPages()]);
  const logoMap = await getMediaMap([settings.identity.logoId]);
  const custom = settings.identity.logoId ? logoMap.get(settings.identity.logoId) : undefined;
  const logo = custom ? { src: custom.srcMd, width: custom.width, height: custom.height } : DEFAULT_LOGO;
  const t = settings.theme;
  const css = `:root{--brand:${t.primary};--accent:${t.accent};--soft:${t.soft};--forest:${mix(t.primary, "#0f1f14", 0.62)};}`;
  const services = settings.cookies.services
    .filter((s) => s.enabled)
    .map((s) => ({ id: s.id, name: s.name, purpose: s.purpose, provider: s.provider, scriptUrl: s.scriptUrl }));
  const contactHref = nav.publishedSlugs.has("contact") ? "/contact" : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      {settings.seo.preproduction && (
        <div className="preprod" role="note">
          <strong>Version de présentation</strong> — contenus en cours de validation par l'association.
        </div>
      )}
      <Header links={nav.main} logo={{ ...logo, alt: settings.identity.logoAlt }} siteName={settings.identity.siteName} contactHref={contactHref} />
      <main id="contenu" tabIndex={-1}>
        {children}
      </main>
      <Footer settings={settings} links={nav.footer} logo={logo} publishedSlugs={nav.publishedSlugs} />
      <ConsentManager services={services} title={settings.cookies.bannerTitle} text={settings.cookies.bannerText} version={settings.cookies.policyVersion} />
      <Reveal />
    </>
  );
}
