import Link from "next/link";
import { ringPath } from "./Rings";

export function NotFoundView() {
  return (
    <section className="section">
      <div className="wrap notfound">
        <div>
          <p className="eyebrow">Erreur 404</p>
          <h1>Ce chemin ne mène nulle part… pour l'instant.</h1>
          <p className="lede">La page demandée n'existe pas, a été déplacée ou n'est pas encore publiée. Reprenez la balade depuis l'un de ces points de départ.</p>
          <div className="hero__actions" style={{ marginTop: "var(--space-6)" }}>
            <Link className="btn" href="/">
              Revenir à l'accueil
            </Link>
            <Link className="btn btn--ghost" href="/contact">
              Nous écrire
            </Link>
          </div>
        </div>
        <svg className="notfound__visual" viewBox="0 0 400 400" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} className="ring" d={ringPath(200, 230, 40 + i * 26, 0.08, 40 + i * 9)} />
          ))}
          <g className="acorn">
            <path d="M200 40v40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M168 96c0-14 14-22 32-22s32 8 32 22c0 4-2 6-6 6h-52c-4 0-6-2-6-6z" fill="var(--accent)" />
            <path d="M174 102c0 26 12 46 26 52 14-6 26-26 26-52z" fill="color-mix(in srgb, var(--accent) 55%, #f3d7b5)" />
          </g>
        </svg>
      </div>
    </section>
  );
}
