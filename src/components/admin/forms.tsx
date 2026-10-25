"use client";

import { createContext, useActionState, useContext, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/admin/actions/types";

const FormCtx = createContext<FormState>({});
export const useFormResult = () => useContext(FormCtx);

/**
 * Formulaire relié à une action serveur : affiche une notification après
 * enregistrement et les erreurs sous les champs concernés.
 */
export function ActionForm({
  action,
  children,
  className,
  onResult,
  id,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  onResult?: (s: FormState) => void;
  id?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [toast, setToast] = useState<FormState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.stamp) return;
    setToast(state);
    onResult?.(state);
    if (!state.ok) formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    const t = setTimeout(() => setToast(null), state.ok ? 4500 : 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stamp]);

  return (
    <FormCtx.Provider value={state}>
      <form ref={formRef} action={formAction} className={className} id={id} noValidate>
        {children}
      </form>
      {toast?.message && (
        <div className={`toast${toast.ok ? "" : " toast--error"}`} role={toast.ok ? "status" : "alert"}>
          {toast.message}
        </div>
      )}
    </FormCtx.Provider>
  );
}

export function SubmitButton({ children, pendingLabel = "Enregistrement…", className = "btn", name, value }: { children: React.ReactNode; pendingLabel?: string; className?: string; name?: string; value?: string }) {
  const { pending, data } = useFormStatus();
  const mine = pending && (!name || data?.get(name) === value);
  // Le bouton cliqué n'est pas toujours transmis dans les données du formulaire :
  // on recopie son intention dans un champ caché du même nom avant l'envoi.
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const form = e.currentTarget.form;
    if (!form || !name) return;
    let input = form.querySelector<HTMLInputElement>(`input[type=hidden][name="${name}"]`);
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.appendChild(input);
    }
    input.value = value ?? "";
  };
  return (
    <button className={className} type="submit" disabled={pending} onClick={onClick} data-intent={value}>
      {mine ? pendingLabel : children}
    </button>
  );
}

type FieldProps = {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  hint?: React.ReactNode;
  type?: string;
  required?: boolean;
  maxLength?: number;
  multiline?: boolean;
  rows?: number;
  tall?: boolean;
  placeholder?: string;
  autoComplete?: string;
  value?: string;
  onChange?: (v: string) => void;
  options?: { value: string; label: string }[];
  readOnly?: boolean;
};

/** Champ de formulaire accessible : libellé, aide, erreur liée (aria-describedby), compteur. */
export function Field(props: FieldProps) {
  const { errors } = useFormResult();
  return <FieldBase {...props} error={errors?.[props.name]} />;
}

export function FieldBase({ name, label, defaultValue, hint, type = "text", required, maxLength, multiline, rows, tall, placeholder, autoComplete, value, onChange, options, readOnly, error }: FieldProps & { error?: string }) {
  const id = `f-${name.replace(/[^a-z0-9]/gi, "-")}`;
  const [len, setLen] = useState(String(value ?? defaultValue ?? "").length);
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    name,
    required,
    maxLength: multiline ? undefined : maxLength,
    placeholder,
    readOnly,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy,
    ...(value !== undefined ? { value } : { defaultValue: defaultValue ?? "" }),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setLen(e.target.value.length);
      onChange?.(e.target.value);
    },
  };
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {options ? (
        <select {...common}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea {...common} rows={rows ?? 4} className={tall ? "tall" : undefined} />
      ) : (
        <input {...common} type={type} autoComplete={autoComplete} />
      )}
      {hint && (
        <span className="field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field__error" id={`${id}-err`}>
          {error}
        </span>
      )}
      {maxLength && multiline && <span className={`counter${len > maxLength ? " counter--over" : ""}`}>{`${len} / ${maxLength}`}</span>}
    </div>
  );
}

export function Toggle({ name, label, hint, defaultChecked, checked, onChange }: { name: string; label: string; hint?: string; defaultChecked?: boolean; checked?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        name={name}
        {...(checked !== undefined ? { checked } : { defaultChecked })}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

/** Bouton de suppression avec confirmation explicite. */
export function ConfirmForm({
  action,
  fields,
  label,
  confirmText,
  className = "btn btn--danger",
}: {
  action: (fd: FormData) => Promise<void>;
  fields: Record<string, string | number>;
  label: string;
  confirmText: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      className="inline-form"
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton className={className} pendingLabel="…">
        {label}
      </SubmitButton>
    </form>
  );
}
