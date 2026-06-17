"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type Tipo = "success" | "error" | "info";
type Toast = { id: number; tipo: Tipo; msg: string };

const ToastCtx = createContext<{ push: (tipo: Tipo, msg: string) => void } | null>(null);

export function useToast() {
  const c = useContext(ToastCtx);
  if (!c) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return {
    success: (m: string) => c.push("success", m),
    error: (m: string) => c.push("error", m),
    info: (m: string) => c.push("info", m),
  };
}

const ICON = { success: CheckCircle2, error: XCircle, info: Info } as const;
const COR = { success: "#22c55e", error: "#ef4444", info: "#38bdf8" } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((tipo: Tipo, msg: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, tipo, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => {
          const Icon = ICON[t.tipo];
          return (
            <div
              key={t.id}
              className="animate-toast-in pointer-events-auto flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--elevated)]/95 p-3 shadow-[var(--shadow)] backdrop-blur"
            >
              <Icon size={18} style={{ color: COR[t.tipo] }} className="mt-0.5 shrink-0" />
              <span className="flex-1 text-sm leading-snug">{t.msg}</span>
              <button
                onClick={() => remove(t.id)}
                className="text-[var(--faint)] transition hover:text-[var(--text)]"
                aria-label="Fechar"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
