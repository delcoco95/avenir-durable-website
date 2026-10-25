import Link from "next/link";
import type { Section, SectionOf } from "@/lib/sections";
import { sectionsSchema } from "@/lib/sections";
import { getMediaMap, getPublishedDomains, getPublishedFaq, getPublishedProjects, getVisiblePartners, type MediaRef } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { renderMarkdown } from "@/lib/markdown";
import type { SiteSettings } from "@/lib/settings-schema";
import type { Domain, FaqItem, Partner, Project } from "@/db/schema";
import { Picture } from "./Picture";
import { DomainGlyph, Rings, Sprout, ValueGlyph, ringPath } from "./Rings";
import { ContactForm } from "./ContactForm";
import { LegalContent } from "./Legal";
import { ProjectCard } from "./ProjectCard";

type Ctx = {
  media: Map<number, MediaRef>;
  domains: Domain[];
  projects: Project[];
  partners: Partner[];
  faq: FaqItem[];
  settings: SiteSettings;
  pageTitle: string;
};

/** Rend la liste des sections d'une page (version publiée ou brouillon en aperçu). */
export async function Sections({ sections: raw, pageTitle }: { sections: unknown[]; pageTitle: string }) {
  const parsed = sectionsSchema.safeParse(raw);
  const sections: Section[] = parsed.success ? parsed.data : [];
  const types = new Set(sections.map((s) => s.type));
  const [settings, domains, projects, partners, faq] = await Promise.all([
    getSettings(),
    types.has("domains") || types.has("projects") ? getPublishedDomains() : Promise.resolve([] as Domain[]),
    types.has("projects") ? getPublishedProjects() : Promise.resolve([] as Project[]),
    types.has("partners") ? getVisiblePartners() : Promise.resolve([] as Partner[]),
    types.has("faq") ? getPublishedFaq() : Promise.resolve([] as FaqItem[]),
  ]);
  const ids = sections.flatMap((s) => ("imageId" in s ? [s.imageId] : []));
  ids.push(...projects.map((p) => p.coverId), ...partners.map((p) => p.logoId), ...domains.map((d) => d.imageId));
  const media = await getMediaMap(ids);
  const ctx: Ctx = { media, domains, projects, partners, faq, settings, pageTitle };

  // Un titre de niveau 1 unique par page : si aucune section d'en-tête, on l'ajoute.
  const hasHero = sections[0]?.type === "hero";
  return (
    <>
      {!hasHero && (
        <header className="page-hero">
          <div className="wrap">
            <h1>{pageTitle}</h1>
          </div>
        </header>
      )}
      {sections.map((s, index) => (
        <SectionView key={s.id} section={s} ctx={ctx} index={index} />
      ))}
    </>
  );
}

function SectionView({ section, ctx, index }: { section: Section; ctx: Ctx; index: number }) {
  switch (section.type) {
    case "hero":
      return section.variant === "home" ? <HomeHero s={section} ctx={ctx} /> : <PageHero s={section} ctx={ctx} isFirst={index === 0} />;
    case "statement":
      return <Statement s={section} />;
    case "text":
      return <TextBlock s={section} />;
    case "imageText":
      return <ImageText s={section} ctx={ctx} />;
    case "values":
      return <Values s={section} />;
    case "cycle":
      return <Cycle s={section} />;
    case "domains":
      return <Domains s={section} ctx={ctx} />;
    case "projects":
      return <Projects s={section} ctx={ctx} />;
    case "partners":
      return <Partners s={section} ctx={ctx} />;
    case "faq":
      return <Faq s={section} ctx={ctx} />;
    case "cta":
      return <Cta s={section} />;
    case "contact":
      return <Contact s={section} ctx={ctx} />;
    case "legal":
      return (
        <section className="section section--tight">
          <div className="wrap">
            <LegalContent kind={section.kind} extra={section.extra} settings={ctx.settings} />
          </div>
        </section>
      );
  }
}

function Head({ eyebrow, title, intro, as = "h2" }: { eyebrow?: string; title?: string; intro?: string; as?: "h2" | "h1" }) {
  if (!eyebrow && !title && !intro) return null;
  const H = as;
  return (
    <div className="section__head" data-reveal>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      {title && <H>{title}</H>}
      {intro && <p className="lede">{intro}</p>}
    </div>
  );
}

function Cta1({ link, ghost }: { link: { label: string; href: string }; ghost?: boolean }) {
  if (!link.label || !link.href) return null;
  return (
    <Link className={`btn${ghost ? " btn--ghost" : ""}`} href={link.href}>
      {link.label}
      {!ghost && <Sprout />}
    </Link>
  );
}

/* ───── Héros d'accueil : titre ligne à ligne + photo dans les cernes ───── */
function HomeHero({ s, ctx }: { s: SectionOf<"hero">; ctx: Ctx }) {
  const img = s.imageId ? ctx.media.get(s.imageId) : undefined;
  const lines = s.title.split(/\n+/);
  return (
    <header className="hero">
      <div className="wrap hero__grid">
        <div>
          {s.eyebrow && <p className="eyebrow">{s.eyebrow}</p>}
          <h1 className="hero__title">
            {lines.map((l, i) => (
              <span className="line" key={i}>
                <span style={{ ["--i" as string]: i }}>{l}</span>
              </span>
            ))}
          </h1>
          {s.text && <p className="hero__text">{s.text}</p>}
          <div className="hero__actions">
            <Cta1 link={s.primaryCta} />
            <Cta1 link={s.secondaryCta} ghost />
          </div>
        </div>
        <div className="rings-visual">
          <Rings className="rings-visual__svg" count={8} start={150} step={16} accentIndex={5} />
          <span className="rings-visual__seed" aria-hidden="true" />
          <span className="rings-visual__seed rings-visual__seed--2" aria-hidden="true" />
          <figure className="rings-visual__photo" style={{ margin: 0 }}>
            {img ? <Picture media={img} sizes="(max-width: 960px) 90vw, 520px" priority /> : <Rings count={6} start={20} step={14} />}
          </figure>
          {img?.alt && <p className="rings-visual__caption">{img.alt}</p>}
        </div>
      </div>
    </header>
  );
}

function PageHero({ s, ctx, isFirst }: { s: SectionOf<"hero">; ctx: Ctx; isFirst: boolean }) {
  const img = s.imageId ? ctx.media.get(s.imageId) : undefined;
  const H = isFirst ? "h1" : "h2";
  return (
    <header className={`page-hero${img ? " page-hero--with-image" : ""}`}>
      {!img && <Rings className="page-hero__rings" count={7} start={60} step={22} seed={3} />}
      <div className="wrap page-hero__grid">
        <div>
          {s.eyebrow && <p className="eyebrow">{s.eyebrow}</p>}
          <H>{s.title}</H>
          {s.text && <p className="lede">{s.text}</p>}
          {(s.primaryCta.label || s.secondaryCta.label) && (
            <div className="hero__actions">
              <Cta1 link={s.primaryCta} />
              <Cta1 link={s.secondaryCta} ghost />
            </div>
          )}
        </div>
        {img && (
          <div className="page-hero__image">
            <Picture media={img} sizes="(max-width: 960px) 90vw, 440px" priority />
          </div>
        )}
      </div>
    </header>
  );
}

function Statement({ s }: { s: SectionOf<"statement"> }) {
  return (
    <section className="section">
      <div className="wrap">
        {s.eyebrow && (
          <p className="eyebrow" data-reveal>
            {s.eyebrow}
          </p>
        )}
        <div className="statement__grid">
          <h2 className="statement__text" data-reveal>
            {s.title}
          </h2>
          <div data-reveal style={{ ["--d" as string]: 2 }}>
            {s.text && <p className="statement__body">{s.text}</p>}
            {s.link.label && s.link.href && (
              <Link className="text-link" href={s.link.href}>
                {s.link.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function TextBlock({ s }: { s: SectionOf<"text"> }) {
  return (
    <section className="section section--tight">
      <div className="wrap">
        <Head eyebrow={s.eyebrow} title={s.title} />
        <div className="prose" data-reveal dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body) }} />
      </div>
    </section>
  );
}

function ImageText({ s, ctx }: { s: SectionOf<"imageText">; ctx: Ctx }) {
  const img = s.imageId ? ctx.media.get(s.imageId) : undefined;
  return (
    <section className="section">
      <div className={`wrap split${s.imageSide === "left" ? " split--image-left" : ""}`}>
        <div data-reveal>
          {s.eyebrow && <p className="eyebrow">{s.eyebrow}</p>}
          {s.title && <h2>{s.title}</h2>}
          <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body) }} />
          {s.link.label && s.link.href && (
            <Link className="text-link" href={s.link.href}>
              {s.link.label}
            </Link>
          )}
        </div>
        <figure className="split__media" data-reveal style={{ margin: 0, ["--d" as string]: 2 }}>
          {img ? (
            <>
              <Picture media={img} sizes="(max-width: 960px) 90vw, 560px" />
              {img.credit && <figcaption>Crédit : {img.credit}</figcaption>}
            </>
          ) : (
            <Rings count={7} start={40} step={20} />
          )}
        </figure>
      </div>
    </section>
  );
}

function Values({ s }: { s: SectionOf<"values"> }) {
  const items = s.items.filter((i) => i.title);
  return (
    <section className="section">
      <div className="wrap">
        <Head eyebrow={s.eyebrow} title={s.title} intro={s.intro} />
        <dl className="values">
          {items.map((it, i) => (
            <div className="value" key={i} data-reveal style={{ ["--d" as string]: i }}>
              <ValueGlyph />
              <dt>{it.title}</dt>
              <dd>{it.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ───── Démarche : cycle animé (progression dessinée + graine en orbite) ───── */
function Cycle({ s }: { s: SectionOf<"cycle"> }) {
  const steps = s.steps.filter((x) => x.title);
  const n = Math.max(steps.length, 1);
  const R = 160;
  const C = 220;
  return (
    <section className="section section--soft">
      <div className="wrap">
        <Head eyebrow={s.eyebrow} title={s.title} intro={s.intro} />
        <div className="cycle">
          <div className="cycle__diagram" data-reveal>
            <svg viewBox="0 0 440 440" role="img" aria-label={`Schéma de la démarche en ${steps.length} étapes : ${steps.map((x) => x.title).join(", ")}.`}>
              <path className="cycle__track" d={ringPath(C, C, R + 34, 0.05, 11)} />
              <circle className="cycle__track" cx={C} cy={C} r={R} />
              <circle className="cycle__progress" cx={C} cy={C} r={R} pathLength={1} transform={`rotate(-90 ${C} ${C})`} />
              <circle className="cycle__pulse" r="6" style={{ offsetPath: `path("M ${C} ${C - R} a ${R} ${R} 0 1 1 0 ${2 * R} a ${R} ${R} 0 1 1 0 ${-2 * R}")` } as React.CSSProperties} />
              {steps.map((st, i) => {
                const a = (i / n) * Math.PI * 2 - Math.PI / 2;
                const x = C + Math.cos(a) * R;
                const y = C + Math.sin(a) * R;
                return (
                  <g className="cycle__node" key={i}>
                    <circle cx={x} cy={y} r="24" />
                    <text x={x} y={y}>
                      {i + 1}
                    </text>
                  </g>
                );
              })}
              <path d={ringPath(C, C, 46, 0.08, 5)} fill="none" stroke="currentColor" opacity="0.35" />
              <path d={ringPath(C, C, 28, 0.1, 9)} fill="none" stroke="currentColor" opacity="0.5" />
              <circle cx={C} cy={C} r="7" fill="var(--accent)" />
            </svg>
          </div>
          <ol className="cycle__steps">
            {steps.map((st, i) => (
              <li key={i} data-reveal style={{ ["--d" as string]: i }}>
                <div>
                  <h3>{st.title}</h3>
                  {st.text && <p>{st.text}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Domains({ s, ctx }: { s: SectionOf<"domains">; ctx: Ctx }) {
  return (
    <section className="section">
      <div className="wrap">
        <Head eyebrow={s.eyebrow} title={s.title} intro={s.intro} />
        {ctx.domains.length === 0 ? (
          <p className="empty-note">Les domaines d'intervention seront bientôt présentés ici.</p>
        ) : s.layout === "list" ? (
          <ul className="domain-list">
            {ctx.domains.map((d, i) => (
              <li className="domain-row" key={d.id} data-reveal style={{ ["--d" as string]: i }}>
                <Link className="domain-row__link" href={`/nos-actions/${d.slug}`}>
                  <span className="domain-row__icon">
                    <DomainGlyph icon={d.icon} />
                  </span>
                  <h3 className="domain-row__title">{d.title}</h3>
                  <p className="domain-row__summary">{d.summary}</p>
                  <span className="domain-row__arrow" aria-hidden="true">
                    <Sprout />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="domain-grid">
            {ctx.domains.map((d, i) => (
              <article className="domain-tile" key={d.id} data-reveal style={{ ["--d" as string]: i }}>
                <span className="domain-row__icon" style={{ display: "block" }}>
                  <DomainGlyph icon={d.icon} />
                </span>
                <h3>
                  <Link href={`/nos-actions/${d.slug}`}>{d.title}</Link>
                </h3>
                <p className="domain-row__summary">{d.summary}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Projects({ s, ctx }: { s: SectionOf<"projects">; ctx: Ctx }) {
  let list = ctx.projects;
  if (s.mode === "featured") {
    const featured = list.filter((p) => p.featured);
    list = (featured.length ? featured : list).slice(0, s.limit);
  }
  const domainName = new Map(ctx.domains.map((d) => [d.id, d]));
  const usedDomains = ctx.domains.filter((d) => list.some((p) => p.domainId === d.id));
  return (
    <section className="section">
      <div className="wrap">
        <Head eyebrow={s.eyebrow} title={s.title} intro={s.intro} />
        {list.length === 0 ? (
          <p className="empty-note">Les projets de l'association seront présentés ici prochainement.</p>
        ) : (
          <>
            {s.mode === "all" && usedDomains.length > 1 && <ProjectFilterScript domains={usedDomains} />}
            <div className={`project-grid${s.mode === "featured" && list.length >= 3 ? " project-grid--featured" : ""}`} data-project-grid>
              {list.map((p, i) => (
                <ProjectCard key={p.id} project={p} media={p.coverId ? ctx.media.get(p.coverId) : undefined} domain={p.domainId ? domainName.get(p.domainId) : undefined} index={i} />
              ))}
            </div>
          </>
        )}
        {s.link.label && s.link.href && (
          <p style={{ marginTop: "var(--space-6)" }}>
            <Link className="text-link" href={s.link.href}>
              {s.link.label}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

/** Filtres par domaine (amélioration progressive : sans JavaScript, tous les projets restent visibles). */
function ProjectFilterScript({ domains }: { domains: Domain[] }) {
  return (
    <div className="filters" role="group" aria-label="Filtrer les projets par domaine" data-filters hidden>
      <button type="button" className="chip" aria-pressed="true" data-filter="">
        Tous
      </button>
      {domains.map((d) => (
        <button type="button" className="chip" aria-pressed="false" data-filter={String(d.id)} key={d.id}>
          {d.title}
        </button>
      ))}
    </div>
  );
}

function Partners({ s, ctx }: { s: SectionOf<"partners">; ctx: Ctx }) {
  // Aucun partenaire confirmé : la section n'est pas affichée.
  if (ctx.partners.length === 0) return null;
  return (
    <section className="section section--soft">
      <div className="wrap">
        <Head eyebrow={s.eyebrow} title={s.title} intro={s.intro} />
        <ul className="partner-list">
          {ctx.partners.map((p, i) => {
            const logo = p.logoId ? ctx.media.get(p.logoId) : undefined;
            const inner = (
              <>
                {logo && <Picture media={logo} alt={`Logo de ${p.name}`} sizes="200px" />}
                <span className="partner__name">{p.name}</span>
                {p.description && <p>{p.description}</p>}
              </>
            );
            return (
              <li className="partner" key={p.id} data-reveal style={{ ["--d" as string]: i }}>
                {p.url ? (
                  <a href={p.url} rel="noopener noreferrer" target="_blank" style={{ textDecoration: "none", display: "contents" }}>
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Faq({ s, ctx }: { s: SectionOf<"faq">; ctx: Ctx }) {
  let items = s.category ? ctx.faq.filter((f) => f.category === s.category) : ctx.faq;
  if (s.limit > 0) items = items.slice(0, s.limit);
  const groups = new Map<string, FaqItem[]>();
  for (const it of items) groups.set(it.category, [...(groups.get(it.category) ?? []), it]);
  const grouped = !s.category && s.limit === 0 && groups.size > 1;
  return (
    <section className="section">
      <div className="wrap">
        <Head eyebrow={s.eyebrow} title={s.title} intro={s.intro} />
        {items.length === 0 ? (
          <p className="empty-note">Aucune question publiée pour le moment.</p>
        ) : grouped ? (
          [...groups.entries()].map(([cat, list]) => (
            <div className="faq-group" key={cat}>
              <h3>{cat}</h3>
              <FaqList items={list} />
            </div>
          ))
        ) : (
          <FaqList items={items} />
        )}
        {s.link.label && s.link.href && (
          <p style={{ marginTop: "var(--space-6)" }}>
            <Link className="text-link" href={s.link.href}>
              {s.link.label}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="faq">
      {items.map((f) => (
        <details key={f.id}>
          <summary>
            <span>{f.question}</span>
            <span className="faq__icon" aria-hidden="true" />
          </summary>
          <div className="faq__answer prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(f.answer) }} />
        </details>
      ))}
    </div>
  );
}

function Cta({ s }: { s: SectionOf<"cta"> }) {
  return (
    <section className="section section--tight">
      <div className="wrap">
        <div className={`cta-band${s.tone === "soft" ? " cta-band--soft" : ""}`} data-reveal>
          <Rings className="cta-band__rings" count={7} start={40} step={22} seed={19} />
          <h2>{s.title}</h2>
          {s.text && <p>{s.text}</p>}
          {s.button.label && s.button.href && (
            <Link className={`btn ${s.tone === "soft" ? "" : "btn--light"}`} href={s.button.href}>
              {s.button.label}
              <Sprout />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

const SOCIAL_LABELS: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", youtube: "YouTube", x: "X", mastodon: "Mastodon" };

function Contact({ s, ctx }: { s: SectionOf<"contact">; ctx: Ctx }) {
  const c = ctx.settings.contact;
  const socials = Object.entries(ctx.settings.social).filter(([, v]) => v);
  return (
    <section className="section">
      <div className="wrap contact">
        <aside className="contact__aside" data-reveal>
          {s.title && <h2>{s.title}</h2>}
          {s.intro && <p className="lede">{s.intro}</p>}
          <dl>
            {c.email && (
              <>
                <dt>E-mail</dt>
                <dd>
                  <a href={`mailto:${c.email}`}>{c.email}</a>
                </dd>
              </>
            )}
            {c.phone && (
              <>
                <dt>Téléphone</dt>
                <dd>
                  <a href={`tel:${c.phone.replace(/\s/g, "")}`}>{c.phone}</a>
                </dd>
              </>
            )}
            {c.address && (
              <>
                <dt>Adresse</dt>
                <dd style={{ whiteSpace: "pre-line" }}>{c.address}</dd>
              </>
            )}
            {c.hours && (
              <>
                <dt>Disponibilités</dt>
                <dd>{c.hours}</dd>
              </>
            )}
          </dl>
          {socials.length > 0 && (
            <ul className="social-list" aria-label="Réseaux sociaux">
              {socials.map(([k, v]) => (
                <li key={k}>
                  <a className="chip" href={v} rel="noopener noreferrer" target="_blank">
                    {SOCIAL_LABELS[k] ?? k}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <div className="form-card" data-reveal style={{ ["--d" as string]: 2 }}>
          {ctx.settings.contactForm.enabled ? (
            <ContactForm topics={ctx.settings.contactForm.topics} consentText={ctx.settings.contactForm.consentText} successMessage={ctx.settings.contactForm.successMessage} />
          ) : (
            <p>Le formulaire est momentanément indisponible. Vous pouvez nous écrire directement par e-mail.</p>
          )}
        </div>
      </div>
    </section>
  );
}
