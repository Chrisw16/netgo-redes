"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import type { Pop, PopDetalhe, Rack, RackItem } from "@/lib/pop";

const U_PX = 28; // altura em pixels de 1 U

const TIPOS = [
  { v: "olt", l: "OLT", c: "#2f6bff" },
  { v: "switch", l: "Switch", c: "#16a34a" },
  { v: "dio", l: "DIO", c: "#a855f7" },
  { v: "patch", l: "Patch panel", c: "#f59e0b" },
  { v: "servidor", l: "Servidor", c: "#64748b" },
  { v: "nobreak", l: "Nobreak", c: "#dc2626" },
  { v: "outro", l: "Outro", c: "#475569" },
];
const corTipo = (t: string, cor?: string | null) =>
  cor || TIPOS.find((x) => x.v === t)?.c || "#475569";

function uOcupados(rack: Rack, exceto?: number): Set<number> {
  const s = new Set<number>();
  for (const it of rack.itens) {
    if (exceto != null && it.id === exceto) continue;
    for (let u = it.uInicio; u <= it.uInicio + it.uTamanho - 1; u++) s.add(u);
  }
  return s;
}
function primeiroULivre(rack: Rack): number {
  const occ = uOcupados(rack);
  for (let u = 1; u <= rack.alturaU; u++) if (!occ.has(u)) return u;
  return 1;
}

type ItemForm = {
  rackId: number;
  id?: number;
  tipo: string;
  modelo: string;
  fabricante: string;
  uInicio: string;
  uTamanho: string;
  cor: string;
};

export default function PopsPage() {
  const [pops, setPops] = useState<Pop[]>([]);
  const [selId, setSelId] = useState<number | null>(null);
  const [pop, setPop] = useState<PopDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [novoPop, setNovoPop] = useState({ codigo: "", nome: "", endereco: "" });
  const [criandoPop, setCriandoPop] = useState(false);
  const [novoRack, setNovoRack] = useState<{ nome: string; alturaU: string } | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm | null>(null);
  const [erroItem, setErroItem] = useState<string | null>(null);
  const toast = useToast();

  const carregarPops = useCallback(async () => {
    try {
      const r = await fetch("/api/pop", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro);
      setPops(j.pops);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const carregarPop = useCallback(async (id: number) => {
    try {
      const r = await fetch(`/api/pop/${id}`, { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro);
      setPop(j.pop);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    carregarPops();
  }, [carregarPops]);

  useEffect(() => {
    if (selId != null) carregarPop(selId);
    else setPop(null);
  }, [selId, carregarPop]);

  async function criarPop(e: React.FormEvent) {
    e.preventDefault();
    if (!novoPop.codigo && !novoPop.nome) return;
    setCriandoPop(true);
    try {
      const r = await fetch("/api/pop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoPop),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro);
      setNovoPop({ codigo: "", nome: "", endereco: "" });
      await carregarPops();
      setSelId(j.id);
      toast.success("POP criado");
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCriandoPop(false);
    }
  }

  async function excluirPop() {
    if (!selId || !confirm("Excluir este POP e todos os seus racks?")) return;
    await fetch(`/api/pop/${selId}`, { method: "DELETE" });
    setSelId(null);
    await carregarPops();
  }

  async function adicionarRack(e: React.FormEvent) {
    e.preventDefault();
    if (!selId || !novoRack) return;
    await fetch("/api/rack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ popId: selId, nome: novoRack.nome, alturaU: novoRack.alturaU || 42 }),
    });
    setNovoRack(null);
    await carregarPop(selId);
    toast.success("Rack adicionado");
  }

  async function excluirRack(id: number) {
    if (!selId || !confirm("Excluir este rack?")) return;
    await fetch(`/api/rack/${id}`, { method: "DELETE" });
    await carregarPop(selId);
  }

  async function moverItem(it: RackItem, novoInicio: number) {
    if (!selId) return;
    const rack = pop?.racks.find((r) => r.id === it.rackId);
    if (rack) {
      const occ = uOcupados(rack, it.id);
      for (let u = novoInicio; u <= novoInicio + it.uTamanho - 1; u++) if (occ.has(u)) return;
    }
    await fetch(`/api/rack-item/${it.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: it.tipo,
        modelo: it.modelo,
        fabricante: it.fabricante,
        uInicio: novoInicio,
        uTamanho: it.uTamanho,
        cor: it.cor,
      }),
    });
    await carregarPop(selId);
  }

  async function salvarItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemForm || !selId) return;
    // Validação de U's: dentro do rack e sem sobrepor itens existentes.
    const rack = pop?.racks.find((r) => r.id === itemForm.rackId);
    const ini = Number(itemForm.uInicio);
    const tam = Number(itemForm.uTamanho);
    if (!Number.isFinite(ini) || !Number.isFinite(tam) || ini < 1 || tam < 1) {
      setErroItem("U inicial e tamanho devem ser ≥ 1.");
      return;
    }
    if (rack) {
      if (ini + tam - 1 > rack.alturaU) {
        setErroItem(`Excede a altura do rack (${rack.alturaU}U).`);
        return;
      }
      const occ = uOcupados(rack, itemForm.id);
      for (let u = ini; u <= ini + tam - 1; u++) {
        if (occ.has(u)) {
          setErroItem(`O U ${u} já está ocupado.`);
          return;
        }
      }
    }
    setErroItem(null);
    const payload = {
      rackId: itemForm.rackId,
      tipo: itemForm.tipo,
      modelo: itemForm.modelo,
      fabricante: itemForm.fabricante,
      uInicio: itemForm.uInicio,
      uTamanho: itemForm.uTamanho,
      cor: itemForm.cor || null,
    };
    const url = itemForm.id ? `/api/rack-item/${itemForm.id}` : "/api/rack-item";
    await fetch(url, {
      method: itemForm.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setItemForm(null);
    await carregarPop(selId);
    toast.success("Equipamento salvo");
  }

  async function excluirItem() {
    if (!itemForm?.id || !selId) return;
    await fetch(`/api/rack-item/${itemForm.id}`, { method: "DELETE" });
    setItemForm(null);
    await carregarPop(selId);
    toast.success("Equipamento removido");
  }

  return (
    <div className="flex h-screen">
      {/* Lista de POPs */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-[var(--border)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h1 className="font-semibold">POPs</h1>
          <p className="text-xs text-[var(--muted)]">Pontos de presença e seus racks</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {erro && (
            <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {erro}
            </div>
          )}
          <ul className="mb-4 divide-y divide-[var(--border)]/60 text-sm">
            {pops.length === 0 ? (
              <li className="py-2 text-[var(--muted)]">Nenhum POP ainda.</li>
            ) : (
              pops.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setSelId(p.id)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left ${
                      selId === p.id ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    <span className="font-medium">{p.codigo || p.nome || `POP #${p.id}`}</span>
                    <span className="text-xs text-[var(--muted)]">{p.racksCount} racks</span>
                  </button>
                </li>
              ))
            )}
          </ul>

          <form onSubmit={criarPop} className="card space-y-2">
            <h2 className="text-sm font-medium">Novo POP</h2>
            <input
              value={novoPop.codigo}
              onChange={(e) => setNovoPop((p) => ({ ...p, codigo: e.target.value }))}
              className="input"
              placeholder="Código (ex.: POP-Centro)"
            />
            <input
              value={novoPop.nome}
              onChange={(e) => setNovoPop((p) => ({ ...p, nome: e.target.value }))}
              className="input"
              placeholder="Nome"
            />
            <input
              value={novoPop.endereco}
              onChange={(e) => setNovoPop((p) => ({ ...p, endereco: e.target.value }))}
              className="input"
              placeholder="Endereço"
            />
            <button disabled={criandoPop} className="btn-primary w-full">
              {criandoPop ? "Criando…" : "Criar POP"}
            </button>
          </form>
        </div>
      </aside>

      {/* Área dos racks */}
      <main className="min-w-0 flex-1 overflow-auto">
        {!pop ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
            Selecione um POP para montar os racks.
          </div>
        ) : (
          <div className="p-6">
            <header className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">{pop.codigo || pop.nome || `POP #${pop.id}`}</h2>
                <p className="text-sm text-[var(--muted)]">
                  {pop.nome && pop.codigo ? pop.nome : ""} {pop.endereco ? `· ${pop.endereco}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setNovoRack({ nome: "", alturaU: "42" })} className="btn-primary">
                  + Rack
                </button>
                <button onClick={excluirPop} className="btn-danger">
                  Excluir POP
                </button>
              </div>
            </header>

            {novoRack && (
              <form onSubmit={adicionarRack} className="card mb-5 flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Nome do rack</span>
                  <input
                    value={novoRack.nome}
                    onChange={(e) => setNovoRack((r) => r && { ...r, nome: e.target.value })}
                    className="input"
                    placeholder="ex.: Rack 01"
                    autoFocus
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Altura (U)</span>
                  <input
                    type="number"
                    value={novoRack.alturaU}
                    onChange={(e) => setNovoRack((r) => r && { ...r, alturaU: e.target.value })}
                    className="input w-24"
                  />
                </label>
                <button className="btn-primary">Adicionar</button>
                <button type="button" onClick={() => setNovoRack(null)} className="btn">
                  Cancelar
                </button>
              </form>
            )}

            {pop.racks.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Nenhum rack. Clique em <strong className="text-[var(--text)]">+ Rack</strong> para começar.
              </p>
            ) : (
              <div className="flex flex-wrap gap-8">
                {pop.racks.map((rack) => (
                  <RackView
                    key={rack.id}
                    rack={rack}
                    onAddItem={() => {
                      setErroItem(null);
                      setItemForm({
                        rackId: rack.id,
                        tipo: "olt",
                        modelo: "",
                        fabricante: "",
                        uInicio: String(primeiroULivre(rack)),
                        uTamanho: "1",
                        cor: "",
                      });
                    }}
                    onEditItem={(it) => {
                      setErroItem(null);
                      setItemForm({
                        rackId: rack.id,
                        id: it.id,
                        tipo: it.tipo,
                        modelo: it.modelo ?? "",
                        fabricante: it.fabricante ?? "",
                        uInicio: String(it.uInicio),
                        uTamanho: String(it.uTamanho),
                        cor: it.cor ?? "",
                      });
                    }}
                    onMoveItem={moverItem}
                    onDelete={() => excluirRack(rack.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de item */}
      {itemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={salvarItem} className="card w-full max-w-md space-y-3">
            <h3 className="font-semibold">{itemForm.id ? "Editar equipamento" : "Novo equipamento"}</h3>
            {erroItem && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {erroItem}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Tipo</span>
                <select
                  value={itemForm.tipo}
                  onChange={(e) => setItemForm((f) => f && { ...f, tipo: e.target.value })}
                  className="input"
                >
                  {TIPOS.map((t) => (
                    <option key={t.v} value={t.v}>
                      {t.l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Fabricante</span>
                <input
                  value={itemForm.fabricante}
                  onChange={(e) => setItemForm((f) => f && { ...f, fabricante: e.target.value })}
                  className="input"
                  placeholder="ex.: Huawei"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Modelo</span>
              <input
                value={itemForm.modelo}
                onChange={(e) => setItemForm((f) => f && { ...f, modelo: e.target.value })}
                className="input"
                placeholder="ex.: MA5800-X7"
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">U inicial</span>
                <input
                  type="number"
                  value={itemForm.uInicio}
                  onChange={(e) => setItemForm((f) => f && { ...f, uInicio: e.target.value })}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Tamanho (U)</span>
                <input
                  type="number"
                  value={itemForm.uTamanho}
                  onChange={(e) => setItemForm((f) => f && { ...f, uTamanho: e.target.value })}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Cor</span>
                <input
                  type="color"
                  value={itemForm.cor || corTipo(itemForm.tipo)}
                  onChange={(e) => setItemForm((f) => f && { ...f, cor: e.target.value })}
                  className="input h-[38px] p-1"
                />
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <button className="btn-primary">Salvar</button>
              <button type="button" onClick={() => setItemForm(null)} className="btn">
                Cancelar
              </button>
              {itemForm.id && (
                <button type="button" onClick={excluirItem} className="btn-danger ml-auto">
                  Excluir
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function RackView({
  rack,
  onAddItem,
  onEditItem,
  onMoveItem,
  onDelete,
}: {
  rack: Rack;
  onAddItem: () => void;
  onEditItem: (it: RackItem) => void;
  onMoveItem: (it: RackItem, novoInicio: number) => void;
  onDelete: () => void;
}) {
  const altura = rack.alturaU * U_PX;
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ it: RackItem; grabOffset: number; moved: boolean } | null>(null);
  const [drag, setDrag] = useState<{ id: number; inicio: number } | null>(null);

  const slotDoPonteiro = (clientY: number) => {
    const rect = bodyRef.current?.getBoundingClientRect();
    return rect ? Math.floor((clientY - rect.top) / U_PX) : 0;
  };

  function aoPressionar(e: React.PointerEvent, it: RackItem) {
    const topSlot = rack.alturaU - (it.uInicio + it.uTamanho - 1);
    dragRef.current = { it, grabOffset: slotDoPonteiro(e.clientY) - topSlot, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function aoMover(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    d.moved = true;
    const novoTopSlot = Math.min(
      Math.max(slotDoPonteiro(e.clientY) - d.grabOffset, 0),
      rack.alturaU - d.it.uTamanho,
    );
    setDrag({ id: d.it.id, inicio: rack.alturaU - novoTopSlot - d.it.uTamanho + 1 });
  }
  function aoSoltar(it: RackItem) {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && d.moved && drag) onMoveItem(it, drag.inicio);
    else onEditItem(it);
    setDrag(null);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="font-medium">{rack.nome || `Rack #${rack.id}`}</div>
          <div className="text-xs text-[var(--muted)]">{rack.alturaU}U</div>
        </div>
        <div className="flex gap-1">
          <button onClick={onAddItem} className="btn px-2 py-1 text-xs">
            + Equip.
          </button>
          <button onClick={onDelete} className="btn-danger px-2 py-1 text-xs">
            ✕
          </button>
        </div>
      </div>

      <div className="flex">
        {/* régua de U's */}
        <div className="select-none text-right text-[10px] leading-none text-[var(--muted)]">
          {Array.from({ length: rack.alturaU }, (_, i) => rack.alturaU - i).map((u) => (
            <div key={u} style={{ height: U_PX }} className="flex items-center justify-end pr-1">
              {u}
            </div>
          ))}
        </div>

        {/* corpo do rack (gabinete metálico) */}
        <div
          ref={bodyRef}
          className="relative w-64 overflow-hidden rounded-lg"
          style={{
            height: altura,
            background: "linear-gradient(180deg,#0b1220,#06090f)",
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 0 24px rgba(0,0,0,0.6), var(--shadow)",
            border: "1px solid #000",
          }}
        >
          {/* trilhos de montagem (aço) com furos redondos a cada U */}
          {(["left-0", "right-0"] as const).map((lado) => (
            <div
              key={lado}
              className={`pointer-events-none absolute inset-y-0 ${lado} w-4`}
              style={{
                backgroundColor: "#2a3450",
                backgroundImage:
                  "radial-gradient(circle at center, #05080e 0 1.7px, rgba(255,255,255,0.20) 2px 2.6px, transparent 2.8px), linear-gradient(90deg,#3a4660,#28324a 55%,#1b2336)",
                backgroundSize: `100% ${U_PX}px, 100% 100%`,
                backgroundPosition: `center ${U_PX / 2}px, center`,
                backgroundRepeat: "repeat, no-repeat",
                boxShadow: "inset -1px 0 0 rgba(0,0,0,0.5), inset 1px 0 0 rgba(255,255,255,0.08)",
              }}
            />
          ))}

          {/* linhas dos U's */}
          {Array.from({ length: rack.alturaU }).map((_, i) => (
            <div
              key={i}
              className="absolute left-4 right-4 border-b border-white/[0.04]"
              style={{ top: i * U_PX, height: U_PX }}
            />
          ))}

          {/* equipamentos (entre os trilhos) */}
          {rack.itens.map((it) => {
            const arrastando = drag?.id === it.id;
            const inicio = arrastando ? drag!.inicio : it.uInicio;
            const topU = inicio + it.uTamanho - 1;
            const top = (rack.alturaU - topU) * U_PX;
            const height = it.uTamanho * U_PX;
            return (
              <button
                key={it.id}
                onPointerDown={(e) => aoPressionar(e, it)}
                onPointerMove={aoMover}
                onPointerUp={() => aoSoltar(it)}
                className={`absolute left-4 right-4 touch-none transition-shadow ${
                  arrastando ? "z-10 cursor-grabbing opacity-90 drop-shadow-lg" : "cursor-grab"
                }`}
                style={{ top: top + 1, height: height - 2 }}
                title={`${it.tipo} ${it.modelo ?? ""} — arraste para mover`}
              >
                <RackEquip item={it} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Faceplate do equipamento — painel frontal estilo equipamento de rack real. */
function RackEquip({ item }: { item: RackItem }) {
  const cor = corTipo(item.tipo, item.cor);
  const tipoLabel = TIPOS.find((t) => t.v === item.tipo)?.l ?? item.tipo;
  return (
    <div
      className="relative flex h-full w-full select-none overflow-hidden rounded-[3px] text-white"
      style={{
        background: "linear-gradient(180deg,#333f59 0%,#222d44 12%,#161f31 58%,#0f1626 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.5)",
      }}
    >
      <Orelha />
      <div className="my-1 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: cor, boxShadow: `0 0 6px ${cor}` }} />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-[3px] px-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="flex min-w-0 items-center gap-1">
            <span
              className="shrink-0 rounded-[2px] px-1 text-[8px] font-bold uppercase leading-[13px] tracking-wide"
              style={{ color: "#0b0f17", backgroundColor: cor }}
            >
              {tipoLabel}
            </span>
            <span className="truncate text-[10px] font-semibold leading-none text-slate-100">
              {item.modelo || ""}
            </span>
          </span>
          <Leds />
        </div>
        <Painel tipo={item.tipo} cor={cor} />
      </div>
      <Orelha direita />
    </div>
  );
}

/** Orelha de fixação (rack ear) com 2 parafusos. */
function Orelha({ direita }: { direita?: boolean }) {
  return (
    <div
      className="flex h-full w-3.5 shrink-0 flex-col items-center justify-between py-1"
      style={{
        background: direita
          ? "linear-gradient(90deg,#27324a,#3a4664)"
          : "linear-gradient(90deg,#3a4664,#27324a)",
        boxShadow: direita ? "inset 1px 0 0 rgba(0,0,0,0.4)" : "inset -1px 0 0 rgba(0,0,0,0.4)",
      }}
    >
      <Parafuso />
      <Parafuso />
    </div>
  );
}
function Parafuso() {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full"
      style={{
        background: "radial-gradient(circle at 35% 35%, #9fb3d2, #2a3550 75%)",
        boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.6)",
      }}
    />
  );
}

function Leds() {
  return (
    <span className="flex shrink-0 items-center gap-[3px]">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px] shadow-emerald-400" />
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_5px] shadow-amber-400" />
    </span>
  );
}

const PORTA: React.CSSProperties = {
  width: 9,
  height: 10,
  borderRadius: 1,
  background: "linear-gradient(180deg,#11171f,#05080d)",
  boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.10), inset 0 -2px 1px rgba(0,0,0,0.6)",
};
const SFP: React.CSSProperties = {
  width: 13,
  height: 10,
  borderRadius: 1,
  background: "linear-gradient(180deg,#1b2433,#0a0f17)",
  boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.14)",
};

function Fileira({ n }: { n: number }) {
  return (
    <div className="flex gap-[2px]">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={PORTA} />
      ))}
    </div>
  );
}

/** Painel frontal por tipo de equipamento. */
function Painel({ tipo, cor }: { tipo: string; cor: string }) {
  if (tipo === "switch") {
    return (
      <div className="flex flex-col gap-[2px] overflow-hidden">
        <Fileira n={12} />
        <div className="flex items-center gap-[2px]">
          <Fileira n={12} />
          <span className="ml-0.5" style={SFP} />
          <span style={SFP} />
        </div>
      </div>
    );
  }
  if (tipo === "patch") {
    return (
      <div className="flex gap-[4px] overflow-hidden">
        {[0, 1, 2, 3].map((g) => (
          <Fileira key={g} n={6} />
        ))}
      </div>
    );
  }
  if (tipo === "olt") {
    return (
      <div className="flex items-stretch gap-[3px] overflow-hidden">
        {/* line cards */}
        {Array.from({ length: 4 }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 15,
              borderRadius: 1,
              background: "linear-gradient(180deg,#1c2536,#0b1019)",
              boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.08)",
            }}
          />
        ))}
        {/* tela */}
        <span
          style={{
            width: 16,
            borderRadius: 1,
            background: "linear-gradient(180deg,#0a2e26,#06140f)",
            boxShadow: `inset 0 0 0 0.5px ${cor}66, 0 0 5px ${cor}55`,
          }}
        />
        <div className="flex flex-col justify-center gap-[2px]">
          <div className="flex gap-[2px]">
            <span style={SFP} />
            <span style={SFP} />
          </div>
        </div>
      </div>
    );
  }
  if (tipo === "dio") {
    // adaptadores de fibra (acopladores)
    return (
      <div className="flex gap-[3px] overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="rounded-[1px]"
            style={{
              width: 6,
              height: 11,
              background: "linear-gradient(180deg,#2b3a52,#101725)",
              boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.12)",
            }}
          >
            <span className="mx-auto mt-[3px] block h-[4px] w-[4px] rounded-full bg-cyan-300/70 shadow-[0_0_4px] shadow-cyan-300/60" />
          </span>
        ))}
      </div>
    );
  }
  if (tipo === "servidor") {
    // bays de disco verticais + handles
    return (
      <div className="flex items-stretch gap-[2px] overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="relative"
            style={{
              width: 11,
              borderRadius: 1,
              background: "linear-gradient(180deg,#202a3b,#0c121d)",
              boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.07)",
            }}
          >
            <span className="absolute left-1/2 top-[3px] h-[2px] w-1.5 -translate-x-1/2 rounded-full bg-white/15" />
            <span className="absolute bottom-[3px] left-[2px] h-[3px] w-[3px] rounded-full bg-emerald-400/80" />
          </span>
        ))}
      </div>
    );
  }
  if (tipo === "nobreak") {
    return (
      <div className="flex items-center gap-2 overflow-hidden">
        <span
          style={{
            width: 26,
            height: 13,
            borderRadius: 2,
            background: "linear-gradient(180deg,#0a2e3a,#06161d)",
            boxShadow: "inset 0 0 0 0.5px rgba(56,189,248,0.45), 0 0 6px rgba(56,189,248,0.25)",
          }}
        />
        <div className="flex gap-[4px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className="h-3 w-3 rounded-full"
              style={{
                background: "radial-gradient(circle at 50% 50%, #0a0f17 0 30%, #1b2740 60%, #0a0f17 100%)",
                boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.08)",
              }}
            />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-[3px] overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/25" />
      ))}
    </div>
  );
}
