"use client";

import { useState } from "react";
import type { ConsentService } from "@/lib/settings-schema";
import { FieldBase, Toggle } from "./forms";

/** Éditeur des services facultatifs soumis au consentement (statistiques, vidéos…). */
export function ServicesEditor({ initial }: { initial: ConsentService[] }) {
  const [list, setList] = useState<ConsentService[]>(initial);
  const set = (i: number, patch: Partial<ConsentService>) => setList((l) => l.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div>
      <input type="hidden" name="cookies.services" value={JSON.stringify(list)} />
      {list.length === 0 && (
        <p className="notice notice--ok">
          Aucun service facultatif : le site ne dépose que des cookies strictement nécessaires, aucun bandeau de consentement n'est donc affiché (conformément aux recommandations de la CNIL).
        </p>
      )}
      {list.map((s, i) => (
        <fieldset className="item-list" key={i}>
          <legend style={{ fontWeight: 600, padding: "0 0.3rem" }}>{s.name || `Service ${i + 1}`}</legend>
          <Toggle name={`svc-${i}-enabled`} label="Service actif (demande de consentement affichée)" checked={s.enabled} onChange={(v) => set(i, { enabled: v })} />
          <div className="grid-2">
            <FieldBase name={`svc-${i}-name`} label="Nom affiché" value={s.name} maxLength={80} onChange={(v) => set(i, { name: v })} />
            <FieldBase name={`svc-${i}-id`} label="Identifiant technique" value={s.id} maxLength={30} onChange={(v) => set(i, { id: v })} hint="Minuscules et tirets, ex. statistiques" />
            <FieldBase
              name={`svc-${i}-category`}
              label="Catégorie"
              value={s.category}
              onChange={(v) => set(i, { category: v as ConsentService["category"] })}
              options={[
                { value: "statistiques", label: "Mesure d'audience" },
                { value: "medias", label: "Contenus tiers (vidéos, cartes…)" },
                { value: "autre", label: "Autre" },
              ]}
            />
            <FieldBase name={`svc-${i}-provider`} label="Fournisseur" value={s.provider} maxLength={160} onChange={(v) => set(i, { provider: v })} />
          </div>
          <FieldBase name={`svc-${i}-purpose`} label="Finalité (affichée aux visiteurs)" value={s.purpose} maxLength={300} onChange={(v) => set(i, { purpose: v })} />
          <div className="grid-2">
            <FieldBase name={`svc-${i}-cookies`} label="Cookies déposés" value={s.cookies} maxLength={300} onChange={(v) => set(i, { cookies: v })} />
            <FieldBase name={`svc-${i}-duration`} label="Durée de conservation" value={s.duration} maxLength={80} onChange={(v) => set(i, { duration: v })} />
          </div>
          <FieldBase
            name={`svc-${i}-script`}
            label="Script à charger après accord (https://…)"
            value={s.scriptUrl}
            maxLength={300}
            onChange={(v) => set(i, { scriptUrl: v })}
            hint="Le domaine doit aussi être autorisé par la politique de sécurité (variable CSP_EXTRA_SOURCES, voir la documentation)."
          />
          <button type="button" className="btn btn--danger btn--small" onClick={() => setList((l) => l.filter((_, j) => j !== i))}>
            Retirer ce service
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="btn btn--secondary btn--small"
        onClick={() =>
          setList((l) => [...l, { id: `service-${l.length + 1}`, name: "", category: "statistiques", purpose: "", provider: "", cookies: "", duration: "", scriptUrl: "", enabled: false }])
        }
      >
        Ajouter un service facultatif
      </button>
    </div>
  );
}

const PALETTES = {
  foret: { label: "Forêt (couleurs du logo)", primary: "#2F7A34", accent: "#B86B2B", soft: "#EEF6E6" },
  sous_bois: { label: "Sous-bois", primary: "#2E6B4F", accent: "#B8862F", soft: "#EDF4EE" },
  riviere: { label: "Rivière", primary: "#22686E", accent: "#C46A3A", soft: "#E8F3F2" },
} as const;

/** Choix d'une palette cohérente, ou personnalisation encadrée (contraste vérifié côté serveur). */
export function ThemePicker({ palette, primary, accent, soft }: { palette: string; primary: string; accent: string; soft: string }) {
  const [mode, setMode] = useState(palette);
  const [colors, setColors] = useState({ primary, accent, soft });
  return (
    <>
      <fieldset className="field" style={{ border: 0, padding: 0 }}>
        <legend>Palette</legend>
        <div className="swatch-row">
          {Object.entries(PALETTES).map(([k, p]) => (
            <label className="swatch" key={k}>
              <input
                type="radio"
                name="theme.palette"
                value={k}
                checked={mode === k}
                className="visually-hidden"
                onChange={() => {
                  setMode(k);
                  setColors({ primary: p.primary, accent: p.accent, soft: p.soft });
                }}
              />
              <i style={{ background: p.primary }} />
              <i style={{ background: p.accent }} />
              <i style={{ background: p.soft }} />
              <span>{p.label}</span>
            </label>
          ))}
          <label className="swatch">
            <input type="radio" name="theme.palette" value="personnalisee" checked={mode === "personnalisee"} className="visually-hidden" onChange={() => setMode("personnalisee")} />
            <span>Personnalisée</span>
          </label>
        </div>
      </fieldset>
      <div className="grid-3">
        {(
          [
            ["primary", "Couleur principale", "Boutons, liens, pictogrammes"],
            ["accent", "Couleur d'accent", "Petites touches chaleureuses"],
            ["soft", "Fond de section", "Teinte claire des fonds"],
          ] as const
        ).map(([k, label, hint]) => (
          <div className="field" key={k}>
            <label htmlFor={`theme-${k}`}>{label}</label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                id={`theme-${k}`}
                type="color"
                value={colors[k]}
                disabled={mode !== "personnalisee"}
                onChange={(e) => setColors((c) => ({ ...c, [k]: e.target.value.toUpperCase() }))}
                style={{ width: 48, height: 40, padding: 2 }}
              />
              <input name={`theme.${k}`} value={colors[k]} readOnly={mode !== "personnalisee"} onChange={(e) => setColors((c) => ({ ...c, [k]: e.target.value }))} aria-label={`${label} (code hexadécimal)`} />
            </div>
            <span className="field__hint">{hint}</span>
          </div>
        ))}
      </div>
      <div className="panel" style={{ background: colors.soft, borderColor: "transparent" }} aria-label="Aperçu des couleurs">
        <p style={{ margin: "0 0 0.75rem", color: "#2f3b40" }}>
          Aperçu : un texte courant avec <a style={{ color: colors.primary }}>un lien</a> et une <strong style={{ color: colors.accent }}>touche d'accent</strong>.
        </p>
        <span className="btn" style={{ ["--btn-bg" as string]: colors.primary }}>
          Bouton principal
        </span>
      </div>
    </>
  );
}
