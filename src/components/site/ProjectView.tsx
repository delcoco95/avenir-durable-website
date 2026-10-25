import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getMediaMap } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { Picture } from "./Picture";
import { Rings } from "./Rings";

export async function ProjectView({ project: p }: { project: typeof schema.projects.$inferSelect }) {
  const media = await getMediaMap([p.coverId]);
  const cover = p.coverId ? media.get(p.coverId) : undefined;
  const domain = p.domainId ? (await getDb().select().from(schema.domains).where(eq(schema.domains.id, p.domainId)))[0] : undefined;
  const facts = [
    ["Domaine", domain?.status === "published" ? domain.title : ""],
    ["Lieu", p.location],
    ["Période", p.period],
    ["Public", p.audience],
  ].filter(([, v]) => v);
  return (
    <article>
      <header className="page-hero">
        <Rings className="page-hero__rings" count={7} start={60} step={22} seed={p.id * 7} />
        <div className="wrap">
          <Link className="back-link" href="/projets">
            ← Tous les projets
          </Link>
          {p.isPlaceholder && (
            <p>
              <span className="badge">Exemple à valider par l'association</span>
            </p>
          )}
          <h1>{p.title}</h1>
          {p.summary && <p className="lede">{p.summary}</p>}
          {facts.length > 0 && (
            <dl className="detail-meta">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </header>
      <div className="wrap section--tight" style={{ paddingTop: 0 }}>
        {cover && (
          <figure className="detail-cover" style={{ marginInline: 0, maxWidth: cover.width }}>
            <Picture media={cover} sizes="(max-width: 1200px) 94vw, 1180px" priority />
          </figure>
        )}
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
        <p style={{ marginTop: "var(--space-7)" }}>
          <Link className="btn" href="/contact">
            Échanger avec nous sur ce projet
          </Link>
        </p>
      </div>
    </article>
  );
}
