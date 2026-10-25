"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PublicService = { id: string; name: string; purpose: string; provider: string; scriptUrl: string };
type Stored = { v: string; id: string; ts: number; choices: Record<string, boolean> };

const COOKIE = "ad_consent";
const MAX_AGE_S = 182 * 24 * 3600; // 6 mois (recommandation CNIL)
const OPEN_EVENT = "ad:open-consent";

function readConsent(): Stored | null {
  const m = document.cookie.match(/(?:^|;\s*)ad_consent=([^;]+)/);
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1]!)) as Stored;
  } catch {
    return null;
  }
}

function writeConsent(value: Stored) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${MAX_AGE_S}; Path=/; SameSite=Lax${secure}`;
}

function loadScripts(services: PublicService[], choices: Record<string, boolean>) {
  for (const s of services) {
    if (!choices[s.id] || !s.scriptUrl) continue;
    if (document.querySelector(`script[data-consent-service="${s.id}"]`)) continue;
    const el = document.createElement("script");
    el.src = s.scriptUrl;
    el.async = true;
    el.dataset.consentService = s.id;
    document.head.appendChild(el);
  }
}

/**
 * Gestionnaire de consentement extensible.
 * - Sans service facultatif activé : aucun bandeau (rien à consentir), seul le
 *   panneau d'information reste accessible depuis le pied de page.
 * - Avec services : bandeau « Tout accepter / Tout refuser / Personnaliser »,
 *   refus aussi simple que l'acceptation, aucun service chargé avant accord,
 *   choix modifiables à tout moment, preuve de consentement anonyme enregistrée.
 */
export function ConsentManager({ services, title, text, version }: { services: PublicService[]; title: string; text: string; version: string }) {
  const [mode, setMode] = useState<"hidden" | "banner" | "panel">("hidden");
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const stored = readConsent();
    const valid = stored && stored.v === version && Date.now() - stored.ts < MAX_AGE_S * 1000;
    if (valid) {
      setChoices(stored.choices);
      loadScripts(services, stored.choices);
    } else if (services.length > 0) {
      setMode("banner");
    }
    const open = () => {
      lastFocus.current = document.activeElement as HTMLElement;
      setChoices(readConsent()?.choices ?? {});
      setMode("panel");
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, [services, version]);

  useEffect(() => {
    if (mode !== "hidden") panelRef.current?.querySelector<HTMLElement>("h2")?.focus();
    if (mode !== "panel") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const close = useCallback(() => {
    setMode("hidden");
    lastFocus.current?.focus?.();
  }, []);

  const save = useCallback(
    (next: Record<string, boolean>) => {
      const id = readConsent()?.id ?? crypto.randomUUID();
      const value: Stored = { v: version, id, ts: Date.now(), choices: next };
      writeConsent(value);
      setChoices(next);
      // Preuve de consentement (anonyme) ; un retrait d'accord prend effet au rechargement.
      fetch("/api/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value), keepalive: true }).catch(() => {});
      const withdrawn = services.some((s) => choices[s.id] && !next[s.id]);
      loadScripts(services, next);
      if (withdrawn) location.reload();
      else close();
    },
    [services, version, choices, close],
  );

  const all = (value: boolean) => Object.fromEntries(services.map((s) => [s.id, value]));

  if (mode === "hidden") return null;

  return (
    <div
      ref={panelRef}
      className="consent"
      role={mode === "panel" ? "dialog" : "region"}
      aria-modal={mode === "panel" ? true : undefined}
      aria-labelledby="consent-title"
    >
      <h2 id="consent-title" tabIndex={-1}>
        {services.length === 0 ? "Cookies sur ce site" : title}
      </h2>
      {services.length === 0 ? (
        <>
          <p>Ce site n'utilise que des cookies strictement nécessaires à son fonctionnement. Aucun cookie de mesure d'audience, de réseau social ou de publicité n'est déposé : vous n'avez aucun choix à faire.</p>
          <div className="consent__actions">
            <button className="btn" type="button" onClick={close}>
              Fermer
            </button>
          </div>
        </>
      ) : (
        <>
          <p>{text}</p>
          {mode === "panel" && (
            <div>
              <div className="consent__service">
                <span>
                  <strong>Cookies nécessaires</strong>
                  <small>Fonctionnement du site et mémorisation de vos choix. Toujours actifs.</small>
                </span>
                <input className="switch" type="checkbox" checked disabled aria-label="Cookies nécessaires (toujours actifs)" />
              </div>
              {services.map((s) => (
                <div className="consent__service" key={s.id}>
                  <label htmlFor={`consent-${s.id}`}>
                    <strong>{s.name}</strong>
                    <small>
                      {s.purpose}
                      {s.provider && ` — ${s.provider}`}
                    </small>
                  </label>
                  <input
                    id={`consent-${s.id}`}
                    className="switch"
                    type="checkbox"
                    checked={Boolean(choices[s.id])}
                    onChange={(e) => setChoices((c) => ({ ...c, [s.id]: e.target.checked }))}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="consent__actions">
            <button className="btn btn--ghost" type="button" onClick={() => save(all(false))}>
              Tout refuser
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => save(all(true))}>
              Tout accepter
            </button>
            {mode === "banner" ? (
              <button className="btn btn--ghost" type="button" onClick={() => setMode("panel")}>
                Personnaliser
              </button>
            ) : (
              <button className="btn" type="button" onClick={() => save(choices)}>
                Enregistrer mes choix
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function CookiePreferencesButton({ className, label = "Gestion des cookies" }: { className?: string; label?: string }) {
  return (
    <button type="button" className={className ?? "link-button"} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      {label}
    </button>
  );
}
