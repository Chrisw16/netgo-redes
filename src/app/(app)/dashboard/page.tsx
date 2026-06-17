import Link from "next/link";
import {
  Boxes,
  MapPinOff,
  RadioTower,
  GitMerge,
  Cable,
  Spline,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

function Kpi({
  label,
  valor,
  hint,
  icon: Icon,
  cor,
}: {
  label: string;
  valor: string;
  hint?: string;
  icon: LucideIcon;
  cor: string;
}) {
  return (
    <div className="card card-hover group relative overflow-hidden">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
        style={{ background: cor }}
      />
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${cor}22`, color: cor }}
        >
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{valor}</div>
      <div className="text-sm text-[var(--muted)]">{label}</div>
      {hint && <div className="mt-1 text-xs text-[var(--faint)]">{hint}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  let stats;
  let erro: string | null = null;
  try {
    stats = await getStats();
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }

  const semCoord = stats ? stats.ctos - stats.ctosGeo : 0;
  const pctGeo = stats && stats.ctos > 0 ? Math.round((stats.ctosGeo / stats.ctos) * 100) : 0;

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-[var(--muted)]">Visão geral da planta de rede documentada.</p>
        </div>
        <Link href="/planta" className="btn-primary">
          Abrir mapa da planta <ArrowRight size={16} />
        </Link>
      </header>

      {erro ? (
        <div className="card border-red-500/40 text-red-300">Erro ao carregar dados: {erro}</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="CTOs" valor={String(stats.ctos)} hint={`${stats.ctosGeo} no mapa`} icon={Boxes} cor="#16a34a" />
            <Kpi label="Sem coordenada" valor={String(semCoord)} hint="a georreferenciar" icon={MapPinOff} cor="#f59e0b" />
            <Kpi label="Postes" valor={String(stats.postes)} icon={RadioTower} cor="#f59e0b" />
            <Kpi label="CEOs" valor={String(stats.ceos)} icon={GitMerge} cor="#a855f7" />
            <Kpi label="Cabos" valor={String(stats.cabos)} icon={Cable} cor="#38bdf8" />
            <Kpi label="Fibra" valor={`${stats.caboKm.toFixed(1)} km`} icon={Spline} cor="#3b82f6" />
          </div>

          {/* Georreferenciamento */}
          <div className="card mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Georreferenciamento das CTOs</span>
              <span className="text-sm text-[var(--muted)]">
                {stats.ctosGeo}/{stats.ctos} · <span className="text-[var(--text)]">{pctGeo}%</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-soft)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pctGeo}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                }}
              />
            </div>
          </div>

          {stats.ctos === 0 && (
            <div className="card mt-5 text-sm text-[var(--muted)]">
              Ainda não há nada documentado. Comece adicionando elementos no{" "}
              <Link href="/planta" className="text-[var(--accent)] hover:underline">
                mapa da planta
              </Link>
              .
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
