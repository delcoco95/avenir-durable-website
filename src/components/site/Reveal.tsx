"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Apparitions progressives au défilement (IntersectionObserver).
 * Le contenu reste visible sans JavaScript (la classe .js n'est ajoutée qu'ici)
 * et avec « réduire les animations » (géré en CSS).
 * Gère aussi les filtres de projets (amélioration progressive).
 */
export function Reveal() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.classList.add("js");
    const targets = document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible), [data-reveal-self]:not(.is-visible), .cycle__diagram");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((t) => t.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    targets.forEach((t) => io.observe(t));

    // Filtres de projets
    const cleanups: (() => void)[] = [];
    document.querySelectorAll<HTMLElement>("[data-filters]").forEach((bar) => {
      bar.hidden = false;
      const grid = bar.nextElementSibling as HTMLElement | null;
      const onClick = (ev: Event) => {
        const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>("button[data-filter]");
        if (!btn || !grid) return;
        const f = btn.dataset.filter ?? "";
        bar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        grid.querySelectorAll<HTMLElement>("[data-domain]").forEach((card) => {
          card.hidden = Boolean(f) && card.dataset.domain !== f;
        });
      };
      bar.addEventListener("click", onClick);
      cleanups.push(() => bar.removeEventListener("click", onClick));
    });
    return () => {
      io.disconnect();
      cleanups.forEach((c) => c());
    };
  }, [pathname]);
  return null;
}
