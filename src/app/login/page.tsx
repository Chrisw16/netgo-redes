"use client";

import { useActionState } from "react";
import { User, Lock, ArrowRight } from "lucide-react";
import { entrar, type LoginState } from "./actions";

const inicial: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(entrar, inicial);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-[0_12px_32px_-10px_var(--ring)]"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            N
          </div>
          <h1 className="text-xl font-semibold tracking-tight">NetGo Redes</h1>
          <p className="text-sm text-[var(--muted)]">Documentação da planta de rede</p>
        </div>

        <form action={formAction} className="card space-y-4 p-6">
          <div>
            <label className="label">Usuário</label>
            <div className="relative">
              <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
              <input name="user" className="input pl-9" autoFocus autoComplete="username" placeholder="seu usuário" />
            </div>
          </div>
          <div>
            <label className="label">Senha</label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
              <input
                name="pass"
                type="password"
                className="input pl-9"
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
          </div>

          {state.error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {state.error}
            </div>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Entrando…" : "Entrar"}
            {!pending && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--faint)]">
          NetGo Redes · gestão de planta externa FTTH
        </p>
      </div>
    </main>
  );
}
