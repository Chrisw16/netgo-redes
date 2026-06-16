"use client";

import Link from "next/link";
import { useMapa } from "@/components/MapaShell";

export default function PlantaView() {
  const { ctos, postes, sel } = useMapa();
  const ctoSel = sel?.camada === "cto" ? ctos.find((c) => c.id === sel.id) ?? null : null;
  const posteSel = sel?.camada === "poste" ? postes.find((p) => p.id === sel.id) ?? null : null;

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold">Mapa da Planta</h1>
      <p className="mb-4 text-xs text-[var(--muted)]">
        Visão geral da rede. Clique num elemento para ver os detalhes; use as abas CTOs/Postes para
        editar.
      </p>

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
          <Link href="/postes" className="mt-1 inline-block text-xs text-[var(--accent)] hover:underline">
            Editar no módulo Postes →
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
