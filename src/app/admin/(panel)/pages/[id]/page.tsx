import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { sectionsSchema, type Section } from "@/lib/sections";
import { pickerMedia } from "@/lib/admin-data";
import { PageHead, Flash } from "@/components/admin/PageHead";
import { PageEditor } from "@/components/admin/PageEditor";
import { ConfirmForm } from "@/components/admin/forms";
import { PageStateActions } from "@/components/admin/PageStateActions";
import { deletePage } from "@/app/admin/actions/pages";

export const metadata = { title: "Modifier une page" };

export default async function EditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id: raw } = await params;
  const sp = await searchParams;
  const id = Number(raw);
  if (!Number.isInteger(id)) notFound();
  const [page] = await getDb().select().from(schema.pages).where(eq(schema.pages.id, id));
  if (!page) notFound();
  const parsed = sectionsSchema.safeParse(page.draft.sections);
  const sections: Section[] = parsed.success ? parsed.data : [];
  const media = await pickerMedia();

  return (
    <>
      <PageHead
        title={page.draft.title}
        crumbs={[{ href: "/admin/pages", label: "Pages" }]}
        intro={page.slug === "accueil" ? "Page d'accueil du site." : `Adresse : /${page.slug}`}
        actions={
          <>
            <PageStateActions id={page.id} canUnpublish={Boolean(page.published) && page.slug !== "accueil"} canRevert={Boolean(page.published) && page.hasUnpublishedChanges} />
            {!page.isSystem && (
              <ConfirmForm action={deletePage} fields={{ id: page.id }} label="Supprimer" confirmText={`Supprimer définitivement la page « ${page.draft.title} » ? Cette action est irréversible.`} />
            )}
          </>
        }
      />
      <Flash
        params={sp}
        map={{
          cree: { tone: "ok", text: "Page créée. Ajoutez du contenu puis publiez-la lorsqu'elle est prête." },
          erreur: { tone: "error", text: "Cette page essentielle ne peut pas être supprimée." },
        }}
      />
      {!parsed.success && <p className="notice notice--error">Une partie du contenu enregistré est invalide et n'a pas pu être chargée.</p>}
      <PageEditor
        page={{
          id: page.id,
          slug: page.slug,
          isSystem: page.isSystem,
          isPublished: Boolean(page.published),
          hasUnpublishedChanges: page.hasUnpublishedChanges,
          showInNav: page.showInNav,
          navLabel: page.navLabel,
          navOrder: page.navOrder,
          showInFooter: page.showInFooter,
          needsReview: page.needsReview,
        }}
        initial={{ title: page.draft.title, seoTitle: page.draft.seoTitle ?? "", seoDescription: page.draft.seoDescription ?? "", ogImageId: page.draft.ogImageId ?? null, sections }}
        media={media}
      />
    </>
  );
}
