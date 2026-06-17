"use client";

import Link from "next/link";
import { useMapa } from "@/components/MapaShell";

const COR = { cto: "#22c55e", poste: "#f59e0b" } as const;

function mesmoPonto(
  a: { lat: number | null; lng: number | null },
  lat: number,
  lng: number,
): boolean {
  return a.lat != null && a.lng != null && Math.abs(a.lat - lat) < 1e-6 && Math.abs(a.lng - lng) < 1e-6;
}

export default function PlantaView() {
  const { ctos, postes, cabos, sel, setSel } = useMapa();

  const ctoSel = sel?.camada === "cto" ? ctos.find((c) => c.id === sel.id) ?? null : null;
  const posteSel = sel?.camada === "poste" ? postes.find((p) => p.id === sel.id) ?? null : null;
  const caboSel = sel?.camada === "cabo" ? cabos.find((c) => c.id === sel.id) ?? null : null;

  const coord =
    ctoSel && ctoSel.lat != null
      ? { lat: ctoSel.lat, lng: ctoSel.lng as number }
      : posteSel && posteSel.lat != null
        ? { lat: posteSel.lat, lng: posteSel.lng as number }
        : null;

  // Tudo que existe naquele ponto (CTOs e postes co-localizados).
  const aqui = coord
    ? [
        ...ctos
          .filter((c) => mesmoPonto(c, coord.lat, coord.lng))
          .map((c) => ({ camada: "cto", id: c.id, label: c.codigo })),
        ...postes
          .filter((p) => mesmoPonto(p, coord.lat, coord.lng))
          .map((p) => ({ camada: "poste", id: p.id, label: p.codigo || "(sem código)" })),
      ]
    : [];

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold">Mapa da Planta</h1>
      <p className="mb-4 text-xs text-[var(--muted)]">
        Visão geral da rede. Clique num ponto para ver tudo que há ali.
      </p>

      {aqui.length > 1 && (
        <div className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Neste ponto
          </h2>
          <div className="space-y-1">
            {aqui.map((e) => {
              const ativo = sel?.camada === e.camada && sel?.id === e.id;
              return (
                <button
                  key={`${e.camada}-${e.id}`}
                  onClick={() => setSel({ camada: e.camada, id: e.id })}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                    ativo ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COR[e.camada as keyof typeof COR] }}
                  />
                  <span className="font-medium">{e.label}</span>
                  <span className="text-xs uppercase text-[var(--muted)]">{e.camada}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
          <Detalhe
            rotulo="Poste"
            valor={
              ctoSel.posteId != null
                ? postes.find((p) => p.id === ctoSel.posteId)?.codigo || `#${ctoSel.posteId}`
                : null
            }
          />
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
          <Detalhe
            rotulo="CTOs no poste"
            valor={
              ctos.filter((c) => c.posteId === posteSel.id).map((c) => c.codigo).join(", ") || null
            }
          />
          <Detalhe
            rotulo="Cabos passando"
            valor={
              cabos
                .filter((c) => c.posteIds.includes(posteSel.id))
                .map((c) => c.codigo || `#${c.id}`)
                .join(", ") || null
            }
          />
          <Link href="/postes" className="mt-1 inline-block text-xs text-[var(--accent)] hover:underline">
            Editar no módulo Postes →
          </Link>
        </div>
      ) : caboSel ? (
        <div className="card space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold">{caboSel.codigo || "(sem código)"}</span>
            <span className="rounded-md bg-[#38bdf8]/20 px-2 py-0.5 text-xs text-[#38bdf8]">Cabo</span>
          </div>
          <Detalhe rotulo="Tipo" valor={caboSel.tipo} />
          <Detalhe rotulo="Fibras" valor={caboSel.fibras != null ? String(caboSel.fibras) : null} />
          <Detalhe
            rotulo="Comprimento"
            valor={caboSel.comprimentoM != null ? `${Math.round(caboSel.comprimentoM)} m` : null}
          />
          <Detalhe rotulo="Postes na rota" valor={String(caboSel.posteIds.length)} />
          <Detalhe rotulo="Fabricante" valor={caboSel.fabricante} />
          <Link href="/cabos" className="mt-1 inline-block text-xs text-[var(--accent)] hover:underline">
            Editar no módulo Cabos →
          </Link>
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">Nenhum elemento selecionado.</p>
      )}
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
