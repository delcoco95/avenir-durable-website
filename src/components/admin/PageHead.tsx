import Link from "next/link";

export function PageHead({ title, intro, crumbs, actions }: { title: string; intro?: React.ReactNode; crumbs?: { href: string; label: string }[]; actions?: React.ReactNode }) {
  return (
    <div className="admin-head">
      <div>
        {crumbs && (
          <nav className="crumbs" aria-label="Fil d'Ariane">
            {crumbs.map((c, i) => (
              <span key={c.href}>
                {i > 0 && " / "}
                <Link href={c.href}>{c.label}</Link>
              </span>
            ))}
          </nav>
        )}
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      {actions && <div className="admin-head__actions">{actions}</div>}
    </div>
  );
}

export function StatusPill({ status, changes }: { status: "published" | "draft" | string; changes?: boolean }) {
  if (status === "published" && changes) return <span className="pill pill--changes">Modifications non publiées</span>;
  if (status === "published") return <span className="pill pill--published">Publié</span>;
  return <span className="pill pill--draft">Brouillon</span>;
}

export function Flash({ params, map }: { params: Record<string, string | string[] | undefined>; map: Record<string, { tone: "ok" | "warn" | "error" | "info"; text: string }> }) {
  for (const [key, msg] of Object.entries(map)) {
    if (params[key] !== undefined) {
      return (
        <p className={`notice notice--${msg.tone}`} role="status">
          {msg.text}
        </p>
      );
    }
  }
  return null;
}

export const fmtDate = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(d) : "—";
