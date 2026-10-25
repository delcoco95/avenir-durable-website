"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { replaceMedia, uploadMedia } from "@/app/admin/actions/media";
import { ACCEPT_ATTR, MAX_UPLOAD_MB } from "@/lib/media-client";

/** Zone d'import de la médiathèque (glisser-déposer ou sélection, plusieurs fichiers). */
export function MediaUpload() {
  const router = useRouter();
  const [state, action, pending] = useActionState(uploadMedia, {});
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.stamp, state.ok, router]);
  const send = (files: FileList | null) => {
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
        send(e.dataTransfer.files);
      }}
    >
      <p style={{ margin: "0 0 0.75rem", fontWeight: 600 }}>Glissez vos images ici</p>
      <input ref={input} id="media-files" type="file" accept={ACCEPT_ATTR} multiple className="visually-hidden" onChange={(e) => send(e.target.files)} />
      <button type="button" className="btn" disabled={pending} onClick={() => input.current?.click()}>
        {pending ? "Import et optimisation…" : "Choisir des images"}
      </button>
      <p className="field__hint" style={{ margin: "0.75rem 0 0" }}>
        JPEG, PNG, WebP, AVIF ou GIF · {MAX_UPLOAD_MB} Mo maximum par fichier · 10 fichiers à la fois. Les images sont redimensionnées, converties en WebP et débarrassées de leurs métadonnées
        (dont la géolocalisation).
      </p>
      {state.message && (
        <p className={`notice ${state.ok ? "notice--ok" : "notice--error"}`} style={{ margin: "0.75rem 0 0" }} role="status">
          {state.message}
        </p>
      )}
    </div>
  );
}

export function MediaReplace({ id }: { id: number }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(replaceMedia, {});
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.stamp, state.ok, router]);
  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT_ATTR}
        className="visually-hidden"
        aria-label="Nouveau fichier"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const fd = new FormData();
          fd.append("id", String(id));
          fd.append("file", f);
          startTransition(() => action(fd));
        }}
      />
      <button type="button" className="btn btn--secondary" disabled={pending} onClick={() => input.current?.click()}>
        {pending ? "Remplacement…" : "Remplacer le fichier"}
      </button>
      {state.message && (
        <p className={`notice ${state.ok ? "notice--ok" : "notice--error"}`} style={{ marginTop: "0.75rem" }} role="status">
          {state.message}
        </p>
      )}
    </div>
  );
}
