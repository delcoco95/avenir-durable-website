"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitContact, type ContactState } from "@/app/actions/contact";

const initial: ContactState = { status: "idle" };

export function ContactForm({ topics, consentText, successMessage }: { topics: string[]; consentText: string; successMessage: string }) {
  const [state, action, pending] = useActionState(submitContact, initial);
  const [startedAt, setStartedAt] = useState(0);
  const statusRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => setStartedAt(Date.now()), []);
  useEffect(() => {
    if (state.status === "error") {
      const firstInvalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
      (firstInvalid ?? statusRef.current)?.focus();
    }
    if (state.status === "success") statusRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div className="form-success" ref={statusRef} tabIndex={-1} role="status">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path pathLength={1} d="M32 4a28 28 0 1 1 0 56 28 28 0 0 1 0-56z" opacity="0.4" />
          <path pathLength={1} d="M20 33l8 8 16-18" />
        </svg>
        <h3>Message envoyé</h3>
        <p>{state.message ?? successMessage}</p>
      </div>
    );
  }

  const v = state.values ?? {};
  const e = state.errors ?? {};
  const err = (k: keyof typeof e) => (e[k] ? { "aria-invalid": true as const, "aria-describedby": `err-${k}` } : {});

  return (
    <form ref={formRef} action={action} noValidate>
      <div ref={statusRef} tabIndex={-1} aria-live="polite">
        {state.status === "error" && state.message && <p className="alert alert--error">{state.message}</p>}
      </div>
      <input type="hidden" name="started_at" value={startedAt} />
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="website">Ne pas remplir ce champ</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="name">Nom et prénom</label>
          <input id="name" name="name" autoComplete="name" required maxLength={120} defaultValue={v.name} {...err("name")} />
          {e.name && <span className="field__error" id="err-name">{e.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={v.email} {...err("email")} />
          {e.email && <span className="field__error" id="err-email">{e.email}</span>}
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="organisation">
            Structure <span className="optional">(facultatif)</span>
          </label>
          <input id="organisation" name="organisation" autoComplete="organization" maxLength={160} defaultValue={v.organisation} {...err("organisation")} />
        </div>
        {topics.length > 0 && (
          <div className="field">
            <label htmlFor="topic">Objet</label>
            <select id="topic" name="topic" defaultValue={v.topic ?? ""}>
              <option value="">Choisir un objet</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="field">
        <label htmlFor="message">Votre message</label>
        <textarea id="message" name="message" required minLength={10} maxLength={5000} defaultValue={v.message} {...err("message")} />
        {e.message && <span className="field__error" id="err-message">{e.message}</span>}
      </div>
      <label className="check" htmlFor="consent">
        <input id="consent" name="consent" type="checkbox" required {...err("consent")} />
        <span>
          {consentText} <Link href="/politique-de-confidentialite">Lire la politique de confidentialité</Link>.
        </span>
      </label>
      {e.consent && (
        <p className="field__error" id="err-consent" style={{ marginTop: "-1rem", marginBottom: "1rem" }}>
          {e.consent}
        </p>
      )}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Envoi en cours…" : "Envoyer le message"}
      </button>
    </form>
  );
}
