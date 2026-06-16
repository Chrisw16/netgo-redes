import Link from "next/link";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

function Kpi({ label, valor, hint }: { label: string; valor: string; hint?: string }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wider text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{valor}</div>
      {hint && <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>}
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

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-[var(--muted)]">Visão geral da planta de rede documentada.</p>
      </header>

      {erro ? (
        <div className="card border-red-500/40 text-red-300">
          Erro ao carregar dados: {erro}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="CTOs" valor={String(stats.ctos)} hint={`${stats.ctosGeo} no mapa`} />
            <Kpi label="Sem coordenada" valor={String(semCoord)} hint="a georreferenciar" />
            <Kpi label="Postes" valor={String(stats.postes)} />
            <Kpi label="CEOs" valor={String(stats.ceos)} />
            <Kpi label="Cabos" valor={String(stats.cabos)} />
            <Kpi label="Fibra (km)" valor={stats.caboKm.toFixed(1)} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/planta" className="btn-primary">
              Abrir mapa da planta
            </Link>
          </div>

          {stats.ctos === 0 && (
            <div className="card mt-6 text-sm text-[var(--muted)]">
              Ainda não há nada documentado. Comece adicionando CTOs no{" "}
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
