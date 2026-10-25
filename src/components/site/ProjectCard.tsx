import Link from "next/link";
import type { Domain, Project } from "@/db/schema";
import type { MediaRef } from "@/lib/content";
import { Picture } from "./Picture";
import { Rings } from "./Rings";

export function ProjectCard({ project: p, media, domain, index }: { project: Project; media?: MediaRef; domain?: Domain; index: number }) {
  const meta = [domain?.title, p.location, p.period].filter(Boolean).join(" — ");
  return (
    <article className="project-card" data-reveal data-domain={p.domainId ?? ""} style={{ ["--d" as string]: index }}>
      {p.isPlaceholder && <span className="badge">Exemple à valider</span>}
      <div className="project-card__media">
        {media ? <Picture media={media} sizes="(max-width: 640px) 92vw, (max-width: 960px) 46vw, 600px" /> : <Rings className="project-card__placeholder" count={6} start={30} step={22} seed={p.id * 13} />}
      </div>
      <div className="project-card__body">
        {meta && <p className="project-card__meta">{meta}</p>}
        <h3>
          <Link href={`/projets/${p.slug}`}>{p.title}</Link>
        </h3>
        {p.summary && <p>{p.summary}</p>}
      </div>
    </article>
  );
}
