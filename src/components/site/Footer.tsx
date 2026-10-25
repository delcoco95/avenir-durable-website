import Link from "next/link";
import type { SiteSettings } from "@/lib/settings-schema";
import { CookiePreferencesButton } from "./ConsentManager";
import { Rings } from "./Rings";

const SOCIAL_LABELS: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", youtube: "YouTube", x: "X", mastodon: "Mastodon" };
const LEGAL_SLUGS = ["mentions-legales", "politique-de-confidentialite", "gestion-des-cookies"];

export function Footer({
  settings,
  links,
  logo,
  publishedSlugs,
}: {
  settings: SiteSettings;
  links: { href: string; label: string; slug: string }[];
  logo: { src: string; width: number; height: number } | null;
  publishedSlugs: Set<string>;
}) {
  const socials = Object.entries(settings.social).filter(([, v]) => v);
  const explore = links.filter((l) => !LEGAL_SLUGS.includes(l.slug));
  const legal = LEGAL_SLUGS.filter((s) => publishedSlugs.has(s));
  const legalLabel: Record<string, string> = {
    "mentions-legales": "Mentions légales",
    "politique-de-confidentialite": "Politique de confidentialité",
    "gestion-des-cookies": "Cookies",
  };
  const year = new Date().getFullYear();
  const c = settings.contact;
  return (
    <footer className="site-footer">
      <Rings className="site-footer__rings" count={9} start={40} step={22} seed={29} />
      <div className="wrap">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo.src} alt={settings.identity.logoAlt || settings.identity.siteName} width={logo.width} height={logo.height} loading="lazy" />
            )}
            <p>{settings.footer.text}</p>
          </div>
          <div>
            <h2>Explorer</h2>
            <ul>
              {explore.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Contact</h2>
            <ul>
              {c.email && (
                <li>
                  <a href={`mailto:${c.email}`}>{c.email}</a>
                </li>
              )}
              {c.phone && (
                <li>
                  <a href={`tel:${c.phone.replace(/\s/g, "")}`}>{c.phone}</a>
                </li>
              )}
              {c.address && <li style={{ whiteSpace: "pre-line" }}>{c.address}</li>}
              {publishedSlugs.has("contact") && (
                <li>
                  <Link href="/contact">Formulaire de contact</Link>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h2>Nous suivre</h2>
            {socials.length ? (
              <ul>
                {socials.map(([k, v]) => (
                  <li key={k}>
                    <a href={v} rel="noopener noreferrer" target="_blank">
                      {SOCIAL_LABELS[k] ?? k}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nos réseaux sociaux seront bientôt indiqués ici.</p>
            )}
          </div>
        </div>
        <div className="site-footer__bottom">
          <p style={{ margin: 0 }}>
            © {year} {settings.footer.copyright}
          </p>
          <ul>
            {legal.map((s) => (
              <li key={s}>
                <Link href={`/${s}`}>{legalLabel[s]}</Link>
              </li>
            ))}
            <li>
              <CookiePreferencesButton label="Préférences cookies" />
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
