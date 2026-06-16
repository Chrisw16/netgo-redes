"use client";

import { useActionState } from "react";
import { entrar, type LoginState } from "./actions";

const inicial: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(entrar, inicial);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)] text-xl font-bold text-white">
            N
          </div>
          <h1 className="text-xl font-semibold">NetGo Redes</h1>
          <p className="text-sm text-[var(--muted)]">Documentação da planta de rede</p>
        </div>

        <form action={formAction} className="card space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Usuário</span>
            <input name="user" className="input" autoFocus autoComplete="username" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Senha</span>
            <input
              name="pass"
              type="password"
              className="input"
              autoComplete="current-password"
            />
          </label>

          {state.error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {state.error}
            </div>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
