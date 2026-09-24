"use client";

import { useActionState } from "react";

type AuthResult = { error?: string; success?: string };

type AuthFormProps = {
  action: (state: AuthResult, formData: FormData) => Promise<AuthResult>;
  fields: "login" | "signup" | "reset" | "password";
  submitLabel: string;
  next?: string;
};

const initialState: AuthResult = {};

export function AuthForm({ action, fields, submitLabel, next }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {fields === "signup" && <Field label="Full name" name="fullName" type="text" autoComplete="name" />}
      <Field label="Email" name="email" type="email" autoComplete="email" />
      {fields === "login" && <input type="hidden" name="next" value={next ?? "/account"} />}
      {(fields === "login" || fields === "signup") && <Field label="Password" name="password" type="password" autoComplete={fields === "signup" ? "new-password" : "current-password"} />}
      {fields === "password" && <Field label="New password" name="password" type="password" autoComplete="new-password" />}
      {state.error && <p role="alert" className="border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{state.error}</p>}
      {state.success && <p role="status" className="border border-acid/30 bg-acid/10 px-4 py-3 text-sm text-acid">{state.success}</p>}
      <button disabled={pending} className="flex w-full items-center justify-center bg-acid px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-white disabled:cursor-wait disabled:opacity-60">{pending ? "Please wait" : submitLabel}</button>
    </form>
  );
}

function Field({ label, name, type, autoComplete }: { label: string; name: string; type: string; autoComplete: string }) {
  return <label className="block text-xs uppercase tracking-[0.16em] text-mist"><span className="mb-2 block">{label}</span><input required name={name} type={type} autoComplete={autoComplete} className="w-full border border-white/10 bg-black/20 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none transition placeholder:text-mist/50 focus:border-acid" /></label>;
}
