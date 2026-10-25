"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Sprout } from "./Rings";

type NavLink = { href: string; label: string };

export function Header({ links, logo, siteName, contactHref }: { links: NavLink[]; logo: { src: string; alt: string; width: number; height: number } | null; siteName: string; contactHref: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
      // Piège de focus simple dans le menu mobile
      if (e.key === "Tab" && menuRef.current) {
        const items = [toggleRef.current, ...menuRef.current.querySelectorAll<HTMLElement>("a")].filter(Boolean) as HTMLElement[];
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
  const navLinks = links.filter((l) => l.href !== contactHref);

  return (
    <header className="site-header" data-scrolled={scrolled || open}>
      <div className="wrap site-header__inner">
        <Link className="brand" href="/" aria-label={`${siteName} — accueil`}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo.src} alt="" width={logo.width} height={logo.height} />
          ) : (
            <span className="brand__name">{siteName}</span>
          )}
        </Link>
        <nav className="nav-main" aria-label="Navigation principale">
          <ul className="nav-main__list">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link className="nav-link" href={l.href} aria-current={isCurrent(l.href) ? "page" : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {contactHref && (
            <Link className="btn" href={contactHref} aria-current={isCurrent(contactHref) ? "page" : undefined}>
              Nous contacter
              <Sprout />
            </Link>
          )}
          <button ref={toggleRef} className="nav-toggle" type="button" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
            <span className="nav-toggle__bars" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            {open ? "Fermer" : "Menu"}
          </button>
        </nav>
      </div>
      <div id="mobile-menu" ref={menuRef} className="mobile-menu" data-open={open} aria-hidden={!open} inert={!open}>
        <nav aria-label="Navigation mobile">
          <ul>
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={isCurrent(l.href) ? "page" : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {contactHref && (
            <Link className="btn" href={contactHref}>
              Nous contacter
              <Sprout />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
