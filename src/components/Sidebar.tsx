"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  Boxes,
  RadioTower,
  Cable,
  GitMerge,
  Server,
  Settings,
  Spline,
  DownloadCloud,
  LogOut,
  type LucideIcon,
} from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon };

const GERAL: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planta", label: "Mapa da Planta", icon: Map },
];
const PLANTA: Item[] = [
  { href: "/ctos", label: "CTOs", icon: Boxes },
  { href: "/postes", label: "Postes", icon: RadioTower },
  { href: "/cabos", label: "Cabos", icon: Cable },
  { href: "/ceos", label: "CEOs", icon: GitMerge },
  { href: "/pops", label: "POPs", icon: Server },
];
const EM_BREVE: Item[] = [
  { href: "#", label: "Fusões", icon: Spline },
  { href: "#", label: "Importação", icon: DownloadCloud },
];

export default function Sidebar({ user, isAdmin }: { user: string; isAdmin: boolean }) {
  const path = usePathname();
  const ativo = (href: string) => path === href || path.startsWith(href + "/");

  const link = (i: Item) => (
    <Link
      key={i.href}
      href={i.href}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150 ${
        ativo(i.href)
          ? "bg-[var(--surface-2)] font-medium text-[var(--text)]"
          : "text-[var(--muted)] hover:bg-[var(--surface-2)]/60 hover:text-[var(--text)]"
      }`}
    >
      {ativo(i.href) && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[var(--accent)] to-[var(--accent-2)]" />
      )}
      <i.icon
        size={18}
        className={ativo(i.href) ? "text-[var(--accent)]" : "text-[var(--faint)] group-hover:text-[var(--muted)]"}
      />
      {i.label}
    </Link>
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-soft)]/60 backdrop-blur-sm">
      {/* marca */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl font-bold text-white shadow-[0_8px_20px_-8px_var(--ring)]"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          N
        </div>
        <div className="leading-tight">
          <div className="font-semibold tracking-tight">NetGo Redes</div>
          <div className="eyebrow">planta de rede</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        <div className="space-y-1">{GERAL.map(link)}</div>

        <div>
          <div className="px-3 pb-1.5 eyebrow">Planta</div>
          <div className="space-y-1">{PLANTA.map(link)}</div>
        </div>

        {isAdmin && (
          <div>
            <div className="px-3 pb-1.5 eyebrow">Sistema</div>
            <div className="space-y-1">
              {link({ href: "/configuracoes", label: "Configurações", icon: Settings })}
            </div>
          </div>
        )}

        <div>
          <div className="px-3 pb-1.5 eyebrow">Em breve</div>
          <div className="space-y-1">
            {EM_BREVE.map((i) => (
              <span
                key={i.label}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--faint)] opacity-60"
              >
                <i.icon size={18} className="text-[var(--faint)]" />
                {i.label}
              </span>
            ))}
          </div>
        </div>
      </nav>

      {/* usuário */}
      <div className="border-t border-[var(--border)] p-3">
        <div className="flex items-center gap-3 rounded-xl bg-[var(--surface)]/60 p-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold uppercase text-white"
            style={{ background: "linear-gradient(135deg, var(--accent-deep), var(--accent-2))" }}
          >
            {user.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">{user}</div>
            <div className="text-[11px] text-[var(--muted)]">{isAdmin ? "Administrador" : "Usuário"}</div>
          </div>
          <form action="/api/logout" method="post">
            <button className="icon-btn" title="Sair" aria-label="Sair">
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
