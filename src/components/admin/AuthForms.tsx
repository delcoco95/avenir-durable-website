"use client";

import { useActionState, useState } from "react";
import { changePassword, login } from "@/app/admin/actions/auth";
import type { FormState } from "@/app/admin/actions/types";

function PasswordInput({ id, name, autoComplete, invalid, describedBy }: { id: string; name: string; autoComplete: string; invalid?: boolean; describedBy?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-wrap">
      <input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required maxLength={200} aria-invalid={invalid || undefined} aria-describedby={describedBy} style={{ paddingRight: "5.5rem" }} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
        {show ? "Masquer" : "Afficher"}
      </button>
    </div>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} noValidate>
      {state.message && (
        <p className="alert alert--error" role="alert">
          {state.message}
        </p>
      )}
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="email">Adresse e-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} autoFocus />
      </div>
      <div className="field">
        <label htmlFor="password">Mot de passe</label>
        <PasswordInput id="password" name="password" autoComplete="current-password" />
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate>
      {state.message && (
        <p className={`alert ${state.ok ? "alert--ok" : "alert--error"}`} role={state.ok ? "status" : "alert"}>
          {state.message}
        </p>
      )}
      <div className="field">
        <label htmlFor="current">Mot de passe actuel (ou temporaire)</label>
        <PasswordInput id="current" name="current" autoComplete="current-password" invalid={Boolean(e.current)} />
      </div>
      <div className="field">
        <label htmlFor="next">Nouveau mot de passe</label>
        <PasswordInput id="next" name="next" autoComplete="new-password" invalid={Boolean(e.next)} describedBy="pw-hint" />
        <span className="field__hint" id="pw-hint">
          12 caractères minimum, avec 3 types de caractères — ou une phrase de passe de 16 caractères et plus (ex. : quatre mots sans rapport).
        </span>
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirmer le nouveau mot de passe</label>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" invalid={Boolean(e.confirm)} />
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Changer le mot de passe"}
      </button>
    </form>
  );
}
