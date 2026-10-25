"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/admin/actions/auth";

type Item = { href: string; label: string; count?: number; adminOnly?: boolean };
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "", items: [{ href: "/admin", label: "Tableau de bord" }] },
  {
    title: "Contenus",
    items: [
      { href: "/admin/pages", label: "Pages" },
      { href: "/admin/projets", label: "Projets" },
      { href: "/admin/domaines", label: "Domaines d'intervention" },
      { href: "/admin/faq", label: "FAQ" },
      { href: "/admin/partenaires", label: "Partenaires" },
      { href: "/admin/medias", label: "Médiathèque" },
    ],
  },
  { title: "Relations", items: [{ href: "/admin/messages", label: "Demandes de contact" }] },
  {
    title: "Configuration",
    items: [
      { href: "/admin/parametres", label: "Paramètres du site" },
      { href: "/admin/utilisateurs", label: "Comptes", adminOnly: true },
      { href: "/admin/journal", label: "Journal d'activité", adminOnly: true },
      { href: "/admin/aide", label: "Aide et sauvegardes" },
    ],
  },
];

export function AdminNav({ user, newMessages }: { user: { name: string; email: string; role: string }; newMessages: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const current = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <>
      <div className="admin-topbar">
        <span>Administration</span>
        <button type="button" aria-expanded={open} aria-controls="admin-side" onClick={() => setOpen((o) => !o)}>
          {open ? "Fermer" : "Menu"}
        </button>
      </div>
      <aside id="admin-side" className="admin-side" data-open={open}>
        <Link className="admin-side__brand" href="/admin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="" width={34} height={34} />
          Avenir Durable
        </Link>
        <nav aria-label="Administration">
          {GROUPS.map((g) => (
            <div key={g.title || "home"}>
              {g.title && <div className="admin-nav__group">{g.title}</div>}
              <ul className="admin-nav">
                {g.items
                  .filter((i) => !i.adminOnly || user.role === "admin")
                  .map((i) => (
                    <li key={i.href}>
                      <Link href={i.href} aria-current={current(i.href) ? "page" : undefined}>
                        {i.label}
                        {i.href === "/admin/messages" && newMessages > 0 && (
                          <span className="count" aria-label={`${newMessages} nouvelle(s)`}>
                            {newMessages}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="admin-side__user">
          <strong>{user.name}</strong>
          <span>{user.role === "admin" ? "Administrateur" : "Éditeur"}</span>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            <Link href="/admin/mot-de-passe">Mon mot de passe</Link>
            <a href="/" target="_blank" rel="noopener">
              Voir le site
            </a>
          </div>
          <form action={logout} style={{ marginTop: "0.5rem" }}>
            <button className="link-button" type="submit">
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
