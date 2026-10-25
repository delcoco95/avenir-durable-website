import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Domain } from "@/db/schema";
import { getMediaMap } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { Picture } from "./Picture";
import { DomainGlyph, Rings } from "./Rings";
import { ProjectCard } from "./ProjectCard";

export async function DomainView({ domain: d }: { domain: Domain }) {
  const projects = await getDb()
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.domainId, d.id), eq(schema.projects.status, "published")));
  const media = await getMediaMap([d.imageId, ...projects.map((p) => p.coverId)]);
  const img = d.imageId ? media.get(d.imageId) : undefined;
  return (
    <article>
      <header className={`page-hero${img ? " page-hero--with-image" : ""}`}>
        {!img && <Rings className="page-hero__rings" count={7} start={60} step={22} seed={d.id * 5} />}
        <div className="wrap page-hero__grid">
          <div>
            <Link className="back-link" href="/nos-actions">
              ← Nos actions
            </Link>
            <span className="domain-row__icon" style={{ display: "block", marginBottom: "var(--space-4)" }}>
              <DomainGlyph icon={d.icon} />
            </span>
            <h1>{d.title}</h1>
            {d.summary && <p className="lede">{d.summary}</p>}
          </div>
          {img && (
            <div className="page-hero__image">
              <Picture media={img} sizes="(max-width: 960px) 90vw, 440px" priority />
            </div>
          )}
        </div>
      </header>
      <div className="wrap">
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(d.body) }} />
      </div>
      {projects.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div className="section__head">
              <h2>Projets liés</h2>
            </div>
            <div className="project-grid">
              {projects.map((p, i) => (
                <ProjectCard key={p.id} project={p} media={p.coverId ? media.get(p.coverId) : undefined} domain={d} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
