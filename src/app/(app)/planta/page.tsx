"use client";

import { useCallback, useEffect, useState } from "react";
import dynamicImport from "next/dynamic";
import Link from "next/link";
import type { Cto } from "@/lib/cto";

const PlantaMap = dynamicImport(() => import("@/components/PlantaMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
      Carregando mapa…
    </div>
  ),
});

// Camadas da visão geral. Conforme os módulos forem criados, ligamos cada uma.
const CAMADAS_FUTURAS = ["Postes", "Cabos", "CEOs", "POPs"];

export default function PlantaOverview() {
  const [ctos, setCtos] = useState<Cto[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCtos, setShowCtos] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/cto", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro || "falha ao carregar");
      setCtos(j.ctos as Cto[]);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const sel = ctos.find((c) => c.id === selectedId) ?? null;
  const noMapa = ctos.filter((c) => c.lat != null).length;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-[var(--border)] px-5 py-3">
        <h1 className="text-lg font-semibold">Mapa da Planta</h1>
        <p className="text-xs text-[var(--muted)]">
          Visão geral da rede — clique num elemento para ver os detalhes.
        </p>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-80 shrink-0 overflow-y-auto border-r border-[var(--border)] p-4">
          {erro && (
            <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {erro}
            </div>
          )}

          {/* Camadas */}
          <div className="mb-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Camadas
            </h2>
            <label className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[var(--surface-2)]">
              <span className="flex items-center gap-2 text-sm">
                <span className="inline-block h-3 w-3 rounded-full bg-[#16a34a]" />
                CTOs
              </span>
              <input
                type="checkbox"
                checked={showCtos}
                onChange={(e) => setShowCtos(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </label>
            <div className="px-2 pt-1 text-xs text-[var(--muted)]">
              {carregando ? "carregando…" : `${noMapa} no mapa de ${ctos.length}`}
            </div>

            {CAMADAS_FUTURAS.map((c) => (
              <div
                key={c}
                className="flex items-center justify-between px-2 py-1.5 text-sm text-[var(--muted)] opacity-50"
              >
                <span>{c}</span>
                <span className="text-[10px] uppercase">em breve</span>
              </div>
            ))}
          </div>

          {/* Detalhes do elemento selecionado */}
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Detalhes
            </h2>
            {!sel ? (
              <p className="text-sm text-[var(--muted)]">Nenhum elemento selecionado.</p>
            ) : (
              <div className="card space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">{sel.codigo}</span>
                  <span className="rounded-md bg-[#16a34a]/20 px-2 py-0.5 text-xs text-[#22c55e]">
                    CTO
                  </span>
                </div>
                <Detalhe rotulo="Splitter" valor={sel.tipoSplitter} />
                <Detalhe rotulo="Portas" valor={sel.capacidade != null ? String(sel.capacidade) : null} />
                <Detalhe rotulo="Endereço" valor={sel.endereco} />
                <Detalhe rotulo="Observação" valor={sel.observacao} />
                <Detalhe
                  rotulo="Coordenada"
                  valor={sel.lat != null ? `${sel.lat.toFixed(6)}, ${sel.lng?.toFixed(6)}` : null}
                />
                <Detalhe rotulo="Origem" valor={sel.origem} />
                <Link
                  href="/ctos"
                  className="mt-1 inline-block text-xs text-[var(--accent)] hover:underline"
                >
                  Editar no módulo CTOs →
                </Link>
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <PlantaMap
            ctos={showCtos ? ctos : []}
            selectedId={selectedId}
            pending={null}
            onMapClick={() => {}}
            onSelectCto={setSelectedId}
          />
        </main>
      </div>
    </div>
  );
}

function Detalhe({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--muted)]">{rotulo}</span>
      <span className="text-right">{valor || "—"}</span>
    </div>
  );
}
