"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/planta", label: "Mapa da Planta" },
  { href: "/ctos", label: "CTOs" },
  { href: "/postes", label: "Postes" },
];

// Itens já planejados, ainda em construção (mostrados desabilitados).
const EM_BREVE = ["CEOs", "Cabos", "Fusões", "POPs", "Importação"];

export default function Sidebar({ user, isAdmin }: { user: string; isAdmin: boolean }) {
  const path = usePathname();
  const itens = isAdmin ? [...NAV, { href: "/configuracoes", label: "Configurações" }] : NAV;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] font-bold text-white">
          N
        </div>
        <div className="leading-tight">
          <div className="font-semibold">NetGo Redes</div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
            planta de rede
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {itens.map((i) => {
          const active = path === i.href || path.startsWith(i.href + "/");
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-[var(--accent)] font-medium text-white"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              }`}
            >
              {i.label}
            </Link>
          );
        })}

        <div className="px-3 pb-1 pt-4 text-[10px] uppercase tracking-wider text-[var(--muted)]">
          Em breve
        </div>
        {EM_BREVE.map((l) => (
          <span
            key={l}
            className="block cursor-not-allowed rounded-lg px-3 py-2 text-sm text-[var(--muted)] opacity-50"
          >
            {l}
          </span>
        ))}
      </nav>

      <div className="border-t border-[var(--border)] p-3 text-sm">
        <div className="mb-2 px-1 text-[var(--muted)]">
          {user}
          {isAdmin && " · admin"}
        </div>
        <form action="/api/logout" method="post">
          <button className="btn w-full">Sair</button>
        </form>
      </div>
    </aside>
  );
}
