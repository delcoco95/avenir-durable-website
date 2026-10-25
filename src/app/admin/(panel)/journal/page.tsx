import Link from "next/link";
import { count, desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requirePageUser } from "@/lib/auth/guard";
import { PageHead, fmtDate } from "@/components/admin/PageHead";

export const metadata = { title: "Journal d'activité" };

const PER_PAGE = 50;

export default async function JournalPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePageUser({ role: "admin" });
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = getDb();
  const [rows, [total]] = await Promise.all([
    db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(PER_PAGE).offset((page - 1) * PER_PAGE),
    db.select({ n: count() }).from(schema.auditLog),
  ]);
  const pages = Math.max(1, Math.ceil((total?.n ?? 0) / PER_PAGE));
  return (
    <>
      <PageHead title="Journal d'activité" intro="Trace des opérations sensibles : connexions (réussies, échouées, bloquées), créations, publications, suppressions, changements de comptes et de paramètres." />
      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Compte</th>
              <th scope="col">Action</th>
              <th scope="col">Détail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.createdAt)}</td>
                <td>{r.userLabel}</td>
                <td>
                  <code>{r.action}</code>
                </td>
                <td>
                  {r.summary}
                  {r.entityId && <span className="cell-sub">{`${r.entity} #${r.entityId}`}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">Aucune entrée.</p>}
      </div>
      {pages > 1 && (
        <p style={{ display: "flex", gap: "1rem" }}>
          {page > 1 && <Link href={`/admin/journal?page=${page - 1}`}>← Plus récents</Link>}
          <span>
            Page {page} / {pages}
          </span>
          {page < pages && <Link href={`/admin/journal?page=${page + 1}`}>Plus anciens →</Link>}
        </p>
      )}
    </>
  );
}
