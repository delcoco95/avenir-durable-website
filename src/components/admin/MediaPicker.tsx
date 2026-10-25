"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { uploadMedia } from "@/app/admin/actions/media";
import { ACCEPT_ATTR } from "@/lib/media-client";

export type PickerMedia = { id: number; thumb: string; title: string; alt: string };

/**
 * Sélecteur d'image : choix dans la médiathèque ou import direct.
 * Renvoie l'identifiant du média via un champ caché (formulaires classiques)
 * ou via onChange (éditeur de sections).
 */
export function MediaPicker({
  name,
  label,
  value: initial,
  media: initialMedia,
  onChange,
  hint,
}: {
  name?: string;
  label: string;
  value: number | null;
  media: PickerMedia[];
  onChange?: (id: number | null) => void;
  hint?: string;
}) {
  const [value, setValue] = useState<number | null>(initial);
  const [media, setMedia] = useState(initialMedia);
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [upState, upAction, uploading] = useActionState(uploadMedia, {});

  useEffect(() => setMedia(initialMedia), [initialMedia]);
  useEffect(() => {
    const created = (upState.data?.created as PickerMedia[] | undefined) ?? [];
    if (created.length) {
      setMedia((m) => [...created, ...m.filter((x) => !created.some((c) => c.id === x.id))]);
      choose(created[0]!.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upState.stamp]);

  const current = media.find((m) => m.id === value);
  const choose = (id: number | null) => {
    setValue(id);
    onChange?.(id);
    dialogRef.current?.close();
  };
  const filtered = media.filter((m) => !query || `${m.title} ${m.alt}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="field">
      <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--humus)" }}>{label}</span>
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      <div className="media-field">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="media-field__preview" src={current.thumb} alt={current.alt || current.title} />
        ) : (
          <span className="media-field__empty">Aucune image</span>
        )}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" className="btn btn--secondary btn--small" onClick={() => dialogRef.current?.showModal()}>
            {current ? "Changer l'image" : "Choisir une image"}
          </button>
          {current && (
            <button type="button" className="btn btn--secondary btn--small" onClick={() => choose(null)}>
              Retirer
            </button>
          )}
        </div>
      </div>
      {current && !current.alt && <span className="field__hint" style={{ color: "#9a4c12" }}>Cette image n'a pas de texte alternatif : renseignez-le dans la médiathèque.</span>}
      {hint && <span className="field__hint">{hint}</span>}

      <dialog ref={dialogRef} className="dialog" aria-labelledby={`dlg-${name ?? label}`}>
        <div className="dialog__head">
          <h2 id={`dlg-${name ?? label}`} style={{ margin: 0 }}>
            Choisir une image
          </h2>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={() => dialogRef.current?.close()}>
            ×
          </button>
        </div>
        <div className="dialog__body">
          {/* Formulaire d'import autonome (hors du formulaire parent) */}
          <UploadBox action={upAction} uploading={uploading} message={upState.stamp ? upState.message : undefined} ok={upState.ok} />
          <div className="field" style={{ marginTop: "1rem" }}>
            <label htmlFor={`search-${name ?? label}`}>Rechercher</label>
            <input id={`search-${name ?? label}`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titre ou description" />
          </div>
          {filtered.length === 0 ? (
            <p className="empty">Aucune image. Importez-en une ci-dessus.</p>
          ) : (
            <div className="media-grid">
              {filtered.map((m) => (
                <button type="button" key={m.id} className="media-tile" aria-pressed={m.id === value} onClick={() => choose(m.id)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.thumb} alt="" loading="lazy" />
                  <span>{m.title || "Sans titre"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}

function UploadBox({ action, uploading, message, ok }: { action: (fd: FormData) => void; uploading: boolean; message?: string; ok?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const submit = (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("files", f);
    startTransition(() => action(fd));
  };
  return (
    <div
      className="dropzone"
      data-over={over}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        submit(e.dataTransfer.files);
      }}
    >
      <p style={{ margin: "0 0 0.6rem" }}>Glissez une image ici ou</p>
      <input ref={inputRef} type="file" accept={ACCEPT_ATTR} multiple hidden onChange={(e) => submit(e.target.files)} />
      <button type="button" className="btn btn--small" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? "Import en cours…" : "Importer depuis l'ordinateur"}
      </button>
      <p className="field__hint" style={{ margin: "0.6rem 0 0" }}>
        JPEG, PNG, WebP, AVIF ou GIF — 10 Mo maximum. Les images sont automatiquement optimisées.
      </p>
      {message && (
        <p className={`notice ${ok ? "notice--ok" : "notice--error"}`} style={{ margin: "0.75rem 0 0" }} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
