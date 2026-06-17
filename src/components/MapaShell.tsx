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
import type { Cabo } from "@/lib/cabo";

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
export const COR_CABO = "#38bdf8";

type Selecao = { camada: string; id: number } | null;
type Ponto = { lat: number; lng: number } | null;

interface MapaState {
  ctos: Cto[];
  postes: Poste[];
  cabos: Cabo[];
  recarregar: () => Promise<void>;
  vis: Record<string, boolean>;
  toggleVis: (k: string) => void;
  sel: Selecao;
  setSel: (s: Selecao) => void;
  pending: Ponto;
  setPending: (p: Ponto) => void;
  pendingLine: [number, number][] | null;
  setPendingLine: (l: [number, number][] | null) => void;
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
  const [cabos, setCabos] = useState<Cabo[]>([]);
  const [vis, setVis] = useState<Record<string, boolean>>({ cto: true, poste: true, cabo: true });
  const [sel, setSel] = useState<Selecao>(null);
  const [pending, setPending] = useState<Ponto>(null);
  const [pendingLine, setPendingLine] = useState<[number, number][] | null>(null);
  const clickRef = useRef<((lat: number, lng: number) => void) | null>(null);

  const setMapClick = useCallback((fn: ((lat: number, lng: number) => void) | null) => {
    clickRef.current = fn;
  }, []);

  const recarregar = useCallback(async () => {
    const [rc, rp, rb] = await Promise.all([
      fetch("/api/cto", { cache: "no-store" }),
      fetch("/api/poste", { cache: "no-store" }),
      fetch("/api/cabo", { cache: "no-store" }),
    ]);
    const jc = await rc.json();
    const jp = await rp.json();
    const jb = await rb.json();
    if (jc.ok) setCtos(jc.ctos as Cto[]);
    if (jp.ok) setPostes(jp.postes as Poste[]);
    if (jb.ok) setCabos(jb.cabos as Cabo[]);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const pathname = usePathname();
  useEffect(() => {
    setSel(null);
    setPending(null);
    setPendingLine(null);
    clickRef.current = null;
  }, [pathname]);

  // Qual camada de PONTOS tem prioridade de clique / fica por cima. No módulo
  // de Cabos é o poste (a rota é montada clicando postes), mesmo havendo CTO.
  const pontoAtivo = pathname.startsWith("/ctos")
    ? "cto"
    : pathname.startsWith("/postes") || pathname.startsWith("/cabos")
      ? "poste"
      : null;
  const linhaAtiva = pathname.startsWith("/cabos") ? "cabo" : null;

  // Camadas RELEVANTES por módulo (só os elementos que se integram aparecem):
  // CTO↔poste, cabo↔poste; poste é o hub (mostra CTO e cabo). Mapa da Planta = tudo.
  const relevantes = pathname.startsWith("/ctos")
    ? ["cto", "poste"]
    : pathname.startsWith("/postes")
      ? ["poste", "cto", "cabo"]
      : pathname.startsWith("/cabos")
        ? ["cabo", "poste"]
        : ["cto", "poste", "cabo"];

  const toggleVis = (k: string) => setVis((v) => ({ ...v, [k]: !v[k] }));

  const camadas = [
    ...(relevantes.includes("cto") && vis.cto ? [{ chave: "cto", pontos: ctos, cor: COR_CTO }] : []),
    ...(relevantes.includes("poste") && vis.poste
      ? [{ chave: "poste", pontos: postes, cor: COR_POSTE }]
      : []),
  ];

  const linhas =
    relevantes.includes("cabo") && vis.cabo
      ? [
          {
            chave: "cabo",
            cor: COR_CABO,
            itens: cabos.map((c) => ({ id: c.id, codigo: c.codigo, coords: c.coords })),
          },
        ]
      : [];

  const value: MapaState = {
    ctos,
    postes,
    cabos,
    recarregar,
    vis,
    toggleVis,
    sel,
    setSel,
    pending,
    setPending,
    pendingLine,
    setPendingLine,
    setMapClick,
  };

  return (
    <Ctx.Provider value={value}>
      <div className="flex h-full min-h-0">
        <div className="flex w-80 shrink-0 flex-col border-r border-[var(--border)]">
          <CamadasBar
            vis={vis}
            toggleVis={toggleVis}
            relevantes={relevantes}
            ctos={ctos}
            postes={postes}
            cabos={cabos}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
        <div className="min-w-0 flex-1">
          <PlantaMap
            camadas={camadas}
            linhas={linhas}
            pontoAtivo={pontoAtivo}
            linhaAtiva={linhaAtiva}
            selecionado={sel}
            pending={pending}
            pendingLine={pendingLine}
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
  relevantes,
  ctos,
  postes,
  cabos,
}: {
  vis: Record<string, boolean>;
  toggleVis: (k: string) => void;
  relevantes: string[];
  ctos: Cto[];
  postes: Poste[];
  cabos: Cabo[];
}) {
  const item = (chave: string, cor: string, label: string, n: number) =>
    relevantes.includes(chave) ? (
      <button
        onClick={() => toggleVis(chave)}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
          vis[chave] ? "bg-[var(--surface-2)]" : "opacity-40"
        }`}
      >
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cor }} />
        {label}
        <span className="text-[var(--muted)]">{n}</span>
      </button>
    ) : null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
      <span className="mr-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">Camadas</span>
      {item("cto", COR_CTO, "CTOs", ctos.filter((c) => c.lat != null).length)}
      {item("poste", COR_POSTE, "Postes", postes.filter((p) => p.lat != null).length)}
      {item("cabo", COR_CABO, "Cabos", cabos.filter((c) => c.coords.length >= 2).length)}
    </div>
  );
}
