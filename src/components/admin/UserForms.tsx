"use client";

import { useState } from "react";
import { createUser, resetUserPassword } from "@/app/admin/actions/users";
import type { FormState } from "@/app/admin/actions/types";
import { ActionForm, Field, SubmitButton } from "./forms";

function TempPassword({ state }: { state: FormState | null }) {
  if (!state?.ok || !state.data?.tempPassword) return null;
  return (
    <div className="notice notice--warn" role="status">
      <p style={{ margin: "0 0 0.5rem" }}>
        Mot de passe temporaire pour <strong>{String(state.data.email)}</strong> — copiez-le maintenant, il ne sera plus affiché :
      </p>
      <span className="secret">{String(state.data.tempPassword)}</span>
      <p style={{ margin: "0.5rem 0 0" }}>La personne devra le remplacer à sa première connexion. Transmettez-le par un canal différent de l'adresse de connexion (téléphone, en main propre…).</p>
    </div>
  );
}

export function CreateUserForm() {
  const [result, setResult] = useState<FormState | null>(null);
  return (
    <ActionForm action={createUser} onResult={setResult}>
      <TempPassword state={result} />
      <div className="grid-3">
        <Field name="name" label="Nom" required maxLength={120} />
        <Field name="email" label="E-mail" type="email" required maxLength={254} />
        <Field
          name="role"
          label="Rôle"
          defaultValue="editor"
          options={[
            { value: "editor", label: "Éditeur (contenus et demandes)" },
            { value: "admin", label: "Administrateur (tout, dont comptes et mentions légales)" },
          ]}
        />
      </div>
      <SubmitButton pendingLabel="Création…">Créer le compte</SubmitButton>
    </ActionForm>
  );
}

export function ResetPasswordButton({ id }: { id: number }) {
  const [result, setResult] = useState<FormState | null>(null);
  return (
    <>
      <ActionForm action={resetUserPassword} onResult={setResult}>
        <input type="hidden" name="id" value={id} />
        <SubmitButton className="btn btn--secondary btn--small" pendingLabel="…">
          Réinitialiser le mot de passe
        </SubmitButton>
      </ActionForm>
      <TempPassword state={result} />
    </>
  );
}
