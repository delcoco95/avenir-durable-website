"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { savePage } from "@/app/admin/actions/pages";
import type { FormState } from "@/app/admin/actions/types";
import { SECTION_LABELS, blankSection, type Section, type SectionType } from "@/lib/sections";
import { ActionForm, FieldBase, SubmitButton, Toggle, useFormResult } from "./forms";
import { MediaPicker, type PickerMedia } from "./MediaPicker";

type Content = { title: string; seoTitle: string; seoDescription: string; ogImageId: number | null; sections: Section[] };
type PageInfo = {
  id: number;
  slug: string;
  isSystem: boolean;
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  showInNav: boolean;
  navLabel: string;
  navOrder: number;
  showInFooter: boolean;
  needsReview: boolean;
};

type FieldDef =
  | { key: string; label: string; kind: "text" | "textarea" | "markdown"; max?: number; hint?: string }
  | { key: string; label: string; kind: "select"; options: { value: string; label: string }[]; hint?: string }
  | { key: string; label: string; kind: "number"; min: number; max: number; hint?: string }
  | { key: string; label: string; kind: "media"; hint?: string }
  | { key: string; label: string; kind: "link"; hint?: string }
  | { key: string; label: string; kind: "items"; max: number; hint?: string };

const MD_HINT = "Mise en forme : **gras**, *italique*, listes avec « - », liens [texte](https://…), titres avec « ## ».";
const eyebrow: FieldDef = { key: "eyebrow", label: "Surtitre (facultatif)", kind: "text", max: 80, hint: "Court repère affiché au-dessus du titre." };

const FIELDS: Record<SectionType, FieldDef[]> = {
  hero: [
    { key: "variant", label: "Style", kind: "select", options: [{ value: "page", label: "En-tête de page" }, { value: "home", label: "Grand en-tête animé (accueil)" }] },
    eyebrow,
    { key: "title", label: "Titre", kind: "textarea", max: 160, hint: "Pour le style accueil, chaque retour à la ligne crée une ligne animée." },
    { key: "text", label: "Texte d'introduction", kind: "textarea", max: 500 },
    { key: "primaryCta", label: "Bouton principal", kind: "link" },
    { key: "secondaryCta", label: "Bouton secondaire", kind: "link" },
    { key: "imageId", label: "Image", kind: "media", hint: "Photo mise en valeur à côté du titre." },
  ],
  statement: [eyebrow, { key: "title", label: "Message", kind: "textarea", max: 300 }, { key: "text", label: "Texte complémentaire", kind: "textarea", max: 1200 }, { key: "link", label: "Lien", kind: "link" }],
  text: [eyebrow, { key: "title", label: "Titre (facultatif)", kind: "text", max: 160 }, { key: "body", label: "Texte", kind: "markdown", max: 20000, hint: MD_HINT }],
  imageText: [
    eyebrow,
    { key: "title", label: "Titre", kind: "text", max: 160 },
    { key: "body", label: "Texte", kind: "markdown", max: 6000, hint: MD_HINT },
    { key: "imageId", label: "Image", kind: "media" },
    { key: "imageSide", label: "Position de l'image", kind: "select", options: [{ value: "right", label: "À droite" }, { value: "left", label: "À gauche" }] },
    { key: "link", label: "Lien", kind: "link" },
  ],
  values: [eyebrow, { key: "title", label: "Titre", kind: "text", max: 160 }, { key: "intro", label: "Introduction", kind: "textarea", max: 600 }, { key: "items", label: "Éléments", kind: "items", max: 8 }],
  cycle: [
    eyebrow,
    { key: "title", label: "Titre", kind: "text", max: 160 },
    { key: "intro", label: "Introduction", kind: "textarea", max: 600 },
    { key: "steps", label: "Étapes (3 à 6, dans l'ordre)", kind: "items", max: 6 },
  ],
  domains: [
    eyebrow,
    { key: "title", label: "Titre", kind: "text", max: 160 },
    { key: "intro", label: "Introduction", kind: "textarea", max: 600 },
    { key: "layout", label: "Présentation", kind: "select", options: [{ value: "list", label: "Liste éditoriale" }, { value: "grid", label: "Grille" }] },
  ],
  projects: [
    eyebrow,
    { key: "title", label: "Titre", kind: "text", max: 160 },
    { key: "intro", label: "Introduction", kind: "textarea", max: 600 },
    { key: "mode", label: "Projets affichés", kind: "select", options: [{ value: "featured", label: "Projets mis en avant" }, { value: "all", label: "Tous les projets publiés (avec filtres)" }] },
    { key: "limit", label: "Nombre maximum (projets mis en avant)", kind: "number", min: 1, max: 24 },
    { key: "link", label: "Lien sous la liste", kind: "link" },
  ],
  partners: [eyebrow, { key: "title", label: "Titre", kind: "text", max: 160 }, { key: "intro", label: "Introduction", kind: "textarea", max: 600, hint: "La section n'apparaît que si au moins un partenaire confirmé est publié." }],
  faq: [
    eyebrow,
    { key: "title", label: "Titre", kind: "text", max: 160 },
    { key: "intro", label: "Introduction", kind: "textarea", max: 600 },
    { key: "category", label: "Thème (vide = tous)", kind: "text", max: 80 },
    { key: "limit", label: "Nombre maximum (0 = toutes)", kind: "number", min: 0, max: 50 },
    { key: "link", label: "Lien", kind: "link" },
  ],
  cta: [
    { key: "title", label: "Titre", kind: "text", max: 160 },
    { key: "text", label: "Texte", kind: "textarea", max: 500 },
    { key: "button", label: "Bouton", kind: "link" },
    { key: "tone", label: "Ambiance", kind: "select", options: [{ value: "forest", label: "Vert profond" }, { value: "soft", label: "Clair" }] },
  ],
  contact: [{ key: "title", label: "Titre", kind: "text", max: 160 }, { key: "intro", label: "Introduction", kind: "textarea", max: 800, hint: "Les coordonnées et le formulaire se règlent dans Paramètres." }],
  legal: [
    {
      key: "kind",
      label: "Contenu généré",
      kind: "select",
      options: [
        { value: "mentions", label: "Mentions légales" },
        { value: "confidentialite", label: "Politique de confidentialité" },
        { value: "cookies", label: "Gestion des cookies" },
      ],
      hint: "Rempli automatiquement depuis Paramètres › Informations légales / Données personnelles / Cookies.",
    },
    { key: "extra", label: "Texte complémentaire (facultatif)", kind: "markdown", max: 20000, hint: MD_HINT },
  ],
};

function sectionTitle(s: Section) {
  const t = (s as { title?: string }).title;
  if (t) return t.replace(/\n/g, " ");
  if (s.type === "legal") return { mentions: "Mentions légales", confidentialite: "Politique de confidentialité", cookies: "Gestion des cookies" }[s.kind];
  return "Sans titre";
}

export function PageEditor({ page, initial, media }: { page: PageInfo; initial: Content; media: PickerMedia[] }) {
  const router = useRouter();
  const [content, setContent] = useState<Content>(initial);
  const [open, setOpen] = useState<string | null>(initial.sections[0]?.id ?? null);
  const [dirty, setDirty] = useState(false);
  const [adding, setAdding] = useState<SectionType>("text");
  const [status, setStatus] = useState({ published: page.isPublished, changes: page.hasUnpublishedChanges });
  const [previewRequested, setPreviewRequested] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (fn: (c: Content) => Content) => {
    setContent(fn);
    setDirty(true);
  };
  const setSection = (id: string, patch: Record<string, unknown>) =>
    update((c) => ({ ...c, sections: c.sections.map((s) => (s.id === id ? ({ ...s, ...patch } as Section) : s)) }));
  const move = (i: number, d: -1 | 1) =>
    update((c) => {
      const arr = [...c.sections];
      [arr[i], arr[i + d]] = [arr[i + d]!, arr[i]!];
      return { ...c, sections: arr };
    });
  const remove = (id: string) => {
    if (!window.confirm("Supprimer cette section ? (L'action ne sera définitive qu'à l'enregistrement.)")) return;
    update((c) => ({ ...c, sections: c.sections.filter((s) => s.id !== id) }));
  };
  const duplicate = (i: number) =>
    update((c) => {
      const copy = { ...structuredClone(c.sections[i]!), id: Math.random().toString(36).slice(2, 12) };
      const arr = [...c.sections];
      arr.splice(i + 1, 0, copy);
      return { ...c, sections: arr };
    });
  const add = () => {
    const s = blankSection(adding);
    update((c) => ({ ...c, sections: [...c.sections, s] }));
    setOpen(s.id);
  };

  const json = useMemo(() => JSON.stringify(content), [content]);
  const onResult = (s: FormState) => {
    if (!s.ok) return;
    setDirty(false);
    router.refresh(); // met à jour les actions de l'en-tête (Dépublier, Annuler les modifications…)
    const published = s.message?.startsWith("Page publiée") ?? false;
    setStatus((st) => ({ published: st.published || published, changes: !published }));
    if (previewRequested) {
      setPreviewRequested(false);
      setPreviewReady(true);
      window.open(`/apercu/page/${page.id}`, "_blank");
    }
  };

  const publicUrl = page.slug === "accueil" ? "/" : `/${page.slug}`;

  return (
    <ActionForm action={savePage} onResult={onResult}>
      <input type="hidden" name="id" value={page.id} />
      <input type="hidden" name="content" value={json} />
      <input type="hidden" name="intent" defaultValue="draft" />
      <div className="layout-editor">
        <div>
          <div className="panel">
            <FieldBase name="title" label="Titre de la page" required maxLength={160} value={content.title} onChange={(v) => update((c) => ({ ...c, title: v }))} hint="Utilisé dans l'onglet du navigateur, les menus et les résultats de recherche." />
          </div>
          <h2>Sections</h2>
          <p className="help">Cliquez sur une section pour la modifier. Utilisez les flèches pour changer l'ordre d'affichage.</p>
          {content.sections.length === 0 && <p className="empty panel">Cette page ne contient encore aucune section.</p>}
          {content.sections.map((s, i) => {
            const isOpen = open === s.id;
            return (
              <div className="section-card" key={s.id} data-open={isOpen}>
                <div className="section-card__head">
                  <button type="button" className="section-card__toggle" aria-expanded={isOpen} aria-controls={`sec-${s.id}`} onClick={() => setOpen(isOpen ? null : s.id)}>
                    <span className="section-card__num">{i + 1}</span>
                    <span style={{ minWidth: 0 }}>
                      <span className="section-card__type">{SECTION_LABELS[s.type].label}</span>
                      <span className="section-card__title">{sectionTitle(s)}</span>
                    </span>
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Monter la section ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)}>
                    ↑
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Descendre la section ${i + 1}`} disabled={i === content.sections.length - 1} onClick={() => move(i, 1)}>
                    ↓
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Dupliquer la section ${i + 1}`} onClick={() => duplicate(i)}>
                    ⧉
                  </button>
                  <button type="button" className="icon-btn icon-btn--danger" aria-label={`Supprimer la section ${i + 1}`} onClick={() => remove(s.id)}>
                    ×
                  </button>
                </div>
                {isOpen && (
                  <div className="section-card__body" id={`sec-${s.id}`}>
                    <p className="help" style={{ marginTop: "0.75rem" }}>
                      {SECTION_LABELS[s.type].help}
                    </p>
                    <SectionFields section={s} index={i} media={media} onChange={(patch) => setSection(s.id, patch)} />
                  </div>
                )}
              </div>
            );
          })}
          <div className="add-section">
            <label htmlFor="add-type" style={{ fontWeight: 600 }}>
              Ajouter une section
            </label>
            <select id="add-type" value={adding} onChange={(e) => setAdding(e.target.value as SectionType)} style={{ padding: "0.5rem", borderRadius: 8, border: "1px solid var(--a-line)" }}>
              {(Object.keys(SECTION_LABELS) as SectionType[]).map((t) => (
                <option key={t} value={t}>
                  {SECTION_LABELS[t].label}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn--secondary btn--small" onClick={add}>
              Ajouter
            </button>
          </div>
        </div>

        <aside className="layout-editor__side">
          <div className="panel">
            <div className="panel__head">
              <h2>Publication</h2>
              {status.published ? (
                status.changes || dirty ? <span className="pill pill--changes">Modifications non publiées</span> : <span className="pill pill--published">Publiée</span>
              ) : (
                <span className="pill pill--draft">Non publiée</span>
              )}
            </div>
            {dirty && <p className="notice notice--warn">Modifications non enregistrées.</p>}
            <div className="form-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <SubmitButton name="intent" value="publish" pendingLabel="Publication…">
                Publier
              </SubmitButton>
              <SubmitButton name="intent" value="draft" className="btn btn--secondary" pendingLabel="Enregistrement…">
                Enregistrer le brouillon
              </SubmitButton>
              <PreviewButton onRequest={() => setPreviewRequested(true)} />
              {previewReady && (
                <a className="text-link" href={`/apercu/page/${page.id}`} target="_blank" rel="noopener">
                  Ouvrir l'aperçu du brouillon
                </a>
              )}
              {status.published && (
                <a className="btn btn--secondary" href={publicUrl} target="_blank" rel="noopener">
                  Voir la page en ligne
                </a>
              )}
            </div>
          </div>
          <div className="panel">
            <h2>Réglages</h2>
            <SlugField page={page} />
            <Toggle name="showInNav" label="Afficher dans le menu principal" defaultChecked={page.showInNav} />
            <FieldBase name="navLabel" label="Libellé dans le menu" defaultValue={page.navLabel} maxLength={60} hint="Vide = titre de la page." />
            <FieldBase name="navOrder" label="Position dans le menu" type="number" defaultValue={page.navOrder} hint="Les plus petits nombres s'affichent en premier." />
            <Toggle name="showInFooter" label="Afficher dans le pied de page" defaultChecked={page.showInFooter} />
            <Toggle name="needsReview" label="Contenu à valider par l'association" defaultChecked={page.needsReview} hint="Repère interne, non visible sur le site." />
          </div>
          <div className="panel">
            <h2>Référencement</h2>
            <FieldBase name="seoTitle" label="Titre pour les moteurs de recherche" maxLength={70} value={content.seoTitle} onChange={(v) => update((c) => ({ ...c, seoTitle: v }))} hint={`${content.seoTitle.length}/70 — vide = titre de la page.`} />
            <FieldBase
              name="seoDescription"
              label="Description"
              multiline
              rows={3}
              maxLength={170}
              value={content.seoDescription}
              onChange={(v) => update((c) => ({ ...c, seoDescription: v }))}
              hint="Résumé affiché dans les résultats de recherche (150 à 160 caractères idéalement)."
            />
            <MediaPicker label="Image de partage (réseaux sociaux)" value={content.ogImageId} media={media} onChange={(id) => update((c) => ({ ...c, ogImageId: id }))} />
          </div>
        </aside>
      </div>
    </ActionForm>
  );
}

function PreviewButton({ onRequest }: { onRequest: () => void }) {
  return (
    <button
      type="submit"
      className="btn btn--secondary"
      onClick={(e) => {
        onRequest();
        const input = e.currentTarget.form?.querySelector<HTMLInputElement>("input[name=intent]");
        if (input) input.value = "preview";
      }}
    >
      Enregistrer et prévisualiser
    </button>
  );
}

function SlugField({ page }: { page: PageInfo }) {
  const { errors } = useFormResult();
  if (page.isSystem)
    return (
      <p className="help" style={{ margin: "0 0 1rem" }}>
        Adresse : <code>{page.slug === "accueil" ? "/" : `/${page.slug}`}</code> (page essentielle : adresse fixe, suppression impossible).
      </p>
    );
  return <FieldBase name="slug" label="Adresse de la page" defaultValue={page.slug} maxLength={100} hint="Lettres minuscules, chiffres et tirets. Modifier l'adresse casse les liens existants." error={errors?.slug} />;
}

function SectionFields({ section, index, media, onChange }: { section: Section; index: number; media: PickerMedia[]; onChange: (patch: Record<string, unknown>) => void }) {
  const values = section as unknown as Record<string, unknown>;
  const { errors } = useFormResult();
  const err = (key: string) => errors?.[`sections.${index}.${key}`];
  return (
    <>
      {FIELDS[section.type].map((f) => {
        const name = `s${section.id}-${f.key}`;
        switch (f.kind) {
          case "text":
          case "textarea":
          case "markdown":
            return (
              <FieldBase
                key={f.key}
                name={name}
                label={f.label}
                value={String(values[f.key] ?? "")}
                onChange={(v) => onChange({ [f.key]: v })}
                multiline={f.kind !== "text"}
                tall={f.kind === "markdown"}
                rows={f.kind === "markdown" ? 10 : 3}
                maxLength={f.max}
                hint={f.hint}
                error={err(f.key)}
              />
            );
          case "select":
            return <FieldBase key={f.key} name={name} label={f.label} value={String(values[f.key] ?? "")} onChange={(v) => onChange({ [f.key]: v })} options={f.options} hint={f.hint} />;
          case "number":
            return (
              <FieldBase key={f.key} name={name} label={f.label} type="number" value={String(values[f.key] ?? 0)} onChange={(v) => onChange({ [f.key]: Math.max(f.min, Math.min(f.max, Number(v) || 0)) })} hint={f.hint} />
            );
          case "media":
            return <MediaPicker key={f.key} label={f.label} value={(values[f.key] as number | null) ?? null} media={media} onChange={(id) => onChange({ [f.key]: id })} hint={f.hint} />;
          case "link": {
            const link = (values[f.key] as { label: string; href: string }) ?? { label: "", href: "" };
            return (
              <fieldset key={f.key} className="item-list" style={{ margin: "0 0 1rem" }}>
                <legend style={{ fontWeight: 600, fontSize: "0.9rem", padding: "0 0.3rem" }}>{f.label}</legend>
                <div className="grid-2">
                  <FieldBase name={`${name}-label`} label="Texte du bouton ou du lien" value={link.label} maxLength={60} onChange={(v) => onChange({ [f.key]: { ...link, label: v } })} />
                  <FieldBase
                    name={`${name}-href`}
                    label="Destination"
                    value={link.href}
                    placeholder="/contact ou https://…"
                    onChange={(v) => onChange({ [f.key]: { ...link, href: v } })}
                    error={err(`${f.key}.href`)}
                    hint="Laissez vide pour masquer."
                  />
                </div>
              </fieldset>
            );
          }
          case "items": {
            const items = (values[f.key] as { title: string; text: string }[]) ?? [];
            const set = (next: typeof items) => onChange({ [f.key]: next });
            return (
              <fieldset key={f.key} className="item-list" style={{ margin: "0 0 1rem" }}>
                <legend style={{ fontWeight: 600, fontSize: "0.9rem", padding: "0 0.3rem" }}>{f.label}</legend>
                {items.map((it, j) => (
                  <div className="item-list__row" key={j}>
                    <div>
                      <FieldBase name={`${name}-${j}-t`} label={`Élément ${j + 1} — titre`} value={it.title} maxLength={100} onChange={(v) => set(items.map((x, k) => (k === j ? { ...x, title: v } : x)))} />
                      <FieldBase name={`${name}-${j}-x`} label="Texte" multiline rows={2} value={it.text} maxLength={500} onChange={(v) => set(items.map((x, k) => (k === j ? { ...x, text: v } : x)))} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <button type="button" className="icon-btn" aria-label={`Monter l'élément ${j + 1}`} disabled={j === 0} onClick={() => set(items.map((x, k) => (k === j - 1 ? items[j]! : k === j ? items[j - 1]! : x)))}>
                        ↑
                      </button>
                      <button type="button" className="icon-btn icon-btn--danger" aria-label={`Supprimer l'élément ${j + 1}`} onClick={() => set(items.filter((_, k) => k !== j))}>
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                {items.length < f.max && (
                  <button type="button" className="btn btn--secondary btn--small" onClick={() => set([...items, { title: "", text: "" }])}>
                    Ajouter un élément
                  </button>
                )}
              </fieldset>
            );
          }
        }
      })}
    </>
  );
}
