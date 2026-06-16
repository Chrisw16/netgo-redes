"use client";

import { useCallback, useEffect, useState } from "react";
import dynamicImport from "next/dynamic";
import Link from "next/link";
import type { Cto } from "@/lib/cto";
import type { Poste } from "@/lib/poste";

const PlantaMap = dynamicImport(() => import("@/components/PlantaMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
      Carregando mapa…
    </div>
  ),
});

const COR_CTO = "#16a34a";
const COR_POSTE = "#f59e0b";

const CAMADAS_FUTURAS = ["Cabos", "CEOs", "POPs"];

export default function PlantaOverview() {
  const [ctos, setCtos] = useState<Cto[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [showCtos, setShowCtos] = useState(true);
  const [showPostes, setShowPostes] = useState(true);
  const [sel, setSel] = useState<{ camada: string; id: number } | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [rc, rp] = await Promise.all([
        fetch("/api/cto", { cache: "no-store" }),
        fetch("/api/poste", { cache: "no-store" }),
      ]);
      const jc = await rc.json();
      const jp = await rp.json();
      if (!jc.ok) throw new Error(jc.erro || "falha ao carregar CTOs");
      if (!jp.ok) throw new Error(jp.erro || "falha ao carregar postes");
      setCtos(jc.ctos as Cto[]);
      setPostes(jp.postes as Poste[]);
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

  const camadas = [
    ...(showCtos ? [{ chave: "cto", pontos: ctos, cor: COR_CTO }] : []),
    ...(showPostes ? [{ chave: "poste", pontos: postes, cor: COR_POSTE }] : []),
  ];

  const ctoSel = sel?.camada === "cto" ? ctos.find((c) => c.id === sel.id) ?? null : null;
  const posteSel = sel?.camada === "poste" ? postes.find((p) => p.id === sel.id) ?? null : null;

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

          <div className="mb-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Camadas
            </h2>

            <CamadaToggle
              cor={COR_CTO}
              label="CTOs"
              count={`${ctos.filter((c) => c.lat != null).length}/${ctos.length}`}
              checked={showCtos}
              onChange={setShowCtos}
            />
            <CamadaToggle
              cor={COR_POSTE}
              label="Postes"
              count={`${postes.filter((p) => p.lat != null).length}/${postes.length}`}
              checked={showPostes}
              onChange={setShowPostes}
            />

            {carregando && <div className="px-2 pt-1 text-xs text-[var(--muted)]">carregando…</div>}

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

          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Detalhes
            </h2>
            {ctoSel ? (
              <div className="card space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">{ctoSel.codigo}</span>
                  <span className="rounded-md bg-[#16a34a]/20 px-2 py-0.5 text-xs text-[#22c55e]">CTO</span>
                </div>
                <Detalhe rotulo="Splitter" valor={ctoSel.tipoSplitter} />
                <Detalhe rotulo="Portas" valor={ctoSel.capacidade != null ? String(ctoSel.capacidade) : null} />
                <Detalhe rotulo="Endereço" valor={ctoSel.endereco} />
                <Detalhe rotulo="Observação" valor={ctoSel.observacao} />
                <Link href="/ctos" className="mt-1 inline-block text-xs text-[var(--accent)] hover:underline">
                  Editar no módulo CTOs →
                </Link>
              </div>
            ) : posteSel ? (
              <div className="card space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">{posteSel.codigo || "(sem código)"}</span>
                  <span className="rounded-md bg-[#f59e0b]/20 px-2 py-0.5 text-xs text-[#f59e0b]">Poste</span>
                </div>
                <Detalhe rotulo="Tipo" valor={posteSel.tipo} />
                <Detalhe rotulo="Altura" valor={posteSel.alturaM != null ? `${posteSel.alturaM} m` : null} />
                <Detalhe rotulo="Propriedade" valor={posteSel.dono === "alugado" ? "Alugado" : "Próprio"} />
                <Detalhe rotulo="Concessionária" valor={posteSel.concessionaria} />
                <Detalhe rotulo="Observação" valor={posteSel.observacao} />
                <Link href="/postes" className="mt-1 inline-block text-xs text-[var(--accent)] hover:underline">
                  Editar no módulo Postes →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">Nenhum elemento selecionado.</p>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <PlantaMap camadas={camadas} selecionado={sel} onSelect={(camada, id) => setSel({ camada, id })} />
        </main>
      </div>
    </div>
  );
}

function CamadaToggle({
  cor,
  label,
  count,
  checked,
  onChange,
}: {
  cor: string;
  label: string;
  count: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[var(--surface-2)]">
      <span className="flex items-center gap-2 text-sm">
        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: cor }} />
        {label}
        <span className="text-xs text-[var(--muted)]">{count}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--accent)]"
      />
    </label>
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
