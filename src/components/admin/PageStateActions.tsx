"use client";

import { revertPage, unpublishPage } from "@/app/admin/actions/pages";
import { ActionForm, SubmitButton } from "./forms";

/** Dépublier / abandonner les modifications — formulaires distincts de l'éditeur. */
export function PageStateActions({ id, canUnpublish, canRevert }: { id: number; canUnpublish: boolean; canRevert: boolean }) {
  const refresh = (s: { ok?: boolean }) => s.ok && setTimeout(() => window.location.reload(), 600);
  return (
    <>
      {canRevert && (
        <ActionForm action={revertPage} onResult={refresh}>
          <input type="hidden" name="id" value={id} />
          <SubmitButton className="btn btn--secondary" pendingLabel="…">
            Annuler les modifications non publiées
          </SubmitButton>
        </ActionForm>
      )}
      {canUnpublish && (
        <ActionForm action={unpublishPage} onResult={refresh}>
          <input type="hidden" name="id" value={id} />
          <SubmitButton className="btn btn--secondary" pendingLabel="…">
            Dépublier
          </SubmitButton>
        </ActionForm>
      )}
    </>
  );
}
