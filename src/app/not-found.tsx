import { SiteShell } from "@/components/site/SiteShell";
import { NotFoundView } from "@/components/site/NotFoundView";

export const metadata = { title: "Page introuvable" };

/** 404 pour les adresses hors du site public (ex. /a/b/c) : même habillage que le site. */
export default function RootNotFound() {
  return (
    <SiteShell>
      <NotFoundView />
    </SiteShell>
  );
}
