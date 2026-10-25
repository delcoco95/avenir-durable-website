import { count, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requirePageUser } from "@/lib/auth/guard";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

/** Toutes les pages de ce groupe exigent une session valide (vérifiée côté serveur). */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const [row] = await getDb().select({ n: count() }).from(schema.contactMessages).where(eq(schema.contactMessages.status, "new"));
  return (
    <div className="admin">
      <AdminNav user={{ name: user.name, email: user.email, role: user.role }} newMessages={row?.n ?? 0} />
      <main className="admin-main" id="contenu">
        {children}
      </main>
    </div>
  );
}
