"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamicImport from "next/dynamic";
import { usePathname } from "next/navigation";
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

export const COR_CTO = "#16a34a";
export const COR_POSTE = "#f59e0b";

type Selecao = { camada: string; id: number } | null;
type Ponto = { lat: number; lng: number } | null;

interface MapaState {
  ctos: Cto[];
  postes: Poste[];
  recarregar: () => Promise<void>;
  vis: Record<string, boolean>;
  toggleVis: (k: string) => void;
  sel: Selecao;
  setSel: (s: Selecao) => void;
  pending: Ponto;
  setPending: (p: Ponto) => void;
  /** A aba ativa registra aqui o que fazer quando o usuário clica no mapa. */
  setMapClick: (fn: ((lat: number, lng: number) => void) | null) => void;
}

const Ctx = createContext<MapaState | null>(null);

export function useMapa(): MapaState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMapa precisa estar dentro de <MapaShell>");
  return c;
}

export default function MapaShell({ children }: { children: ReactNode }) {
  const [ctos, setCtos] = useState<Cto[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [vis, setVis] = useState<Record<string, boolean>>({ cto: true, poste: true });
  const [sel, setSel] = useState<Selecao>(null);
  const [pending, setPending] = useState<Ponto>(null);
  const clickRef = useRef<((lat: number, lng: number) => void) | null>(null);

  const setMapClick = useCallback((fn: ((lat: number, lng: number) => void) | null) => {
    clickRef.current = fn;
  }, []);

  const recarregar = useCallback(async () => {
    const [rc, rp] = await Promise.all([
      fetch("/api/cto", { cache: "no-store" }),
      fetch("/api/poste", { cache: "no-store" }),
    ]);
    const jc = await rc.json();
    const jp = await rp.json();
    if (jc.ok) setCtos(jc.ctos as Cto[]);
    if (jp.ok) setPostes(jp.postes as Poste[]);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  // Ao trocar de aba, limpa seleção/posicionamento pendente.
  const pathname = usePathname();
  useEffect(() => {
    setSel(null);
    setPending(null);
    clickRef.current = null;
  }, [pathname]);

  // Camada do módulo ativo (fica por cima e destacada no mapa).
  const ativa = pathname.startsWith("/ctos")
    ? "cto"
    : pathname.startsWith("/postes")
      ? "poste"
      : null;

  const toggleVis = (k: string) => setVis((v) => ({ ...v, [k]: !v[k] }));

  const camadas = [
    ...(vis.cto ? [{ chave: "cto", pontos: ctos, cor: COR_CTO }] : []),
    ...(vis.poste ? [{ chave: "poste", pontos: postes, cor: COR_POSTE }] : []),
  ];

  const value: MapaState = {
    ctos,
    postes,
    recarregar,
    vis,
    toggleVis,
    sel,
    setSel,
    pending,
    setPending,
    setMapClick,
  };

  return (
    <Ctx.Provider value={value}>
      <div className="flex h-full min-h-0">
        <div className="flex w-80 shrink-0 flex-col border-r border-[var(--border)]">
          <CamadasBar vis={vis} toggleVis={toggleVis} ctos={ctos} postes={postes} />
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
        <div className="min-w-0 flex-1">
          <PlantaMap
            camadas={camadas}
            ativa={ativa}
            selecionado={sel}
            pending={pending}
            onMapClick={(lat, lng) => clickRef.current?.(lat, lng)}
            onSelect={(camada, id) => setSel({ camada, id })}
          />
        </div>
      </div>
    </Ctx.Provider>
  );
}

function CamadasBar({
  vis,
  toggleVis,
  ctos,
  postes,
}: {
  vis: Record<string, boolean>;
  toggleVis: (k: string) => void;
  ctos: Cto[];
  postes: Poste[];
}) {
  const item = (chave: string, cor: string, label: string, total: number, noMapa: number) => (
    <button
      onClick={() => toggleVis(chave)}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
        vis[chave] ? "bg-[var(--surface-2)]" : "opacity-40"
      }`}
      title={`${noMapa} no mapa de ${total}`}
    >
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cor }} />
      {label}
      <span className="text-[var(--muted)]">{noMapa}</span>
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
      <span className="mr-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">Camadas</span>
      {item("cto", COR_CTO, "CTOs", ctos.length, ctos.filter((c) => c.lat != null).length)}
      {item("poste", COR_POSTE, "Postes", postes.length, postes.filter((p) => p.lat != null).length)}
    </div>
  );
}
