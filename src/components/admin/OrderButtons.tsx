import { moveItem } from "@/app/admin/actions/content";

/** Boutons ↑ ↓ pour changer l'ordre d'affichage (formulaires serveur, sans JavaScript requis). */
export function OrderButtons({ kind, id, first, last, label }: { kind: "faq" | "domain" | "partner" | "project"; id: number; first: boolean; last: boolean; label: string }) {
  return (
    <span style={{ display: "inline-flex", gap: "0.25rem" }}>
      <form action={moveItem} className="inline-form">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="dir" value="up" />
        <button className="icon-btn" type="submit" disabled={first} aria-label={`Monter « ${label} »`}>
          ↑
        </button>
      </form>
      <form action={moveItem} className="inline-form">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="dir" value="down" />
        <button className="icon-btn" type="submit" disabled={last} aria-label={`Descendre « ${label} »`}>
          ↓
        </button>
      </form>
    </span>
  );
}
