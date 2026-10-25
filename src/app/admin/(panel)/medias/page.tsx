import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { mediaUrl } from "@/lib/content";
import { PageHead, Flash } from "@/components/admin/PageHead";
import { MediaUpload } from "@/components/admin/MediaUpload";

export const metadata = { title: "Médiathèque" };

export default async function MediaLibrary({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const rows = await getDb().select().from(schema.media).orderBy(desc(schema.media.createdAt));
  const noAlt = rows.filter((m) => !m.alt).length;
  return (
    <>
      <PageHead title="Médiathèque" intro="Toutes les images du site. Cliquez sur une image pour modifier son texte alternatif, la remplacer ou la supprimer." />
      <Flash params={sp} map={{ supprime: { tone: "ok", text: "Image supprimée." } }} />
      <div className="panel">
        <MediaUpload />
      </div>
      {noAlt > 0 && (
        <p className="notice notice--warn">
          {noAlt} image(s) sans texte alternatif. Ce texte décrit l'image aux personnes qui ne la voient pas (lecteurs d'écran) : il est indispensable pour l'accessibilité.
        </p>
      )}
      {rows.length === 0 ? (
        <p className="empty panel">La médiathèque est vide.</p>
      ) : (
        <div className="media-grid">
          {rows.map((m) => (
            <Link className="media-tile" href={`/admin/medias/${m.id}`} key={m.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(m, "thumb")} alt="" loading="lazy" />
              <span>{m.title || m.originalName}</span>
              {!m.alt && <span className="warn">Texte alternatif manquant</span>}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
