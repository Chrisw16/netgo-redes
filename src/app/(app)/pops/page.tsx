"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Pop, PopDetalhe, Rack, RackItem } from "@/lib/pop";

const U_PX = 22; // altura em pixels de 1 U

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
  }

  async function excluirItem() {
    if (!itemForm?.id || !selId) return;
    await fetch(`/api/rack-item/${itemForm.id}`, { method: "DELETE" });
    setItemForm(null);
    await carregarPop(selId);
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

        {/* corpo do rack */}
        <div
          ref={bodyRef}
          className="relative w-52 rounded-md border-2 border-[var(--border)] bg-[var(--bg)]"
          style={{ height: altura }}
        >
          {/* linhas dos U's */}
          {Array.from({ length: rack.alturaU }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-b border-[var(--border)]/40"
              style={{ top: i * U_PX, height: U_PX }}
            />
          ))}

          {/* equipamentos */}
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
                className={`absolute left-1 right-1 touch-none ${
                  arrastando ? "z-10 cursor-grabbing opacity-90" : "cursor-grab"
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

/** Faceplate do equipamento — desenho que lembra o aparelho real, no tema escuro. */
function RackEquip({ item }: { item: RackItem }) {
  const cor = corTipo(item.tipo, item.cor);
  const tipoLabel = TIPOS.find((t) => t.v === item.tipo)?.l ?? item.tipo;
  return (
    <div
      className="flex h-full w-full overflow-hidden rounded-sm border border-black/50 text-white shadow-md"
      style={{ background: "linear-gradient(180deg,#26344b 0%,#141c2b 55%,#0e1521 100%)" }}
    >
      {/* faixa de identificação (cor escolhida) */}
      <div className="w-1.5 shrink-0" style={{ backgroundColor: cor }} />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-[3px] px-1.5 py-0.5">
        <div className="flex items-center justify-between gap-1">
          <span className="flex min-w-0 items-center gap-1">
            <span
              className="shrink-0 rounded-sm bg-black/40 px-1 text-[8px] font-bold uppercase leading-[14px] tracking-wide"
              style={{ color: cor }}
            >
              {tipoLabel}
            </span>
            <span className="truncate text-[10px] font-semibold leading-none">{item.modelo || ""}</span>
          </span>
          <Leds />
        </div>
        <Painel tipo={item.tipo} cor={cor} />
      </div>
    </div>
  );
}

function Leds() {
  return (
    <span className="flex shrink-0 items-center gap-[3px]">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px] shadow-emerald-400" />
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_4px] shadow-amber-400" />
    </span>
  );
}

/** Tira de "portas"/cards que muda conforme o tipo do equipamento. */
function Painel({ tipo, cor }: { tipo: string; cor: string }) {
  const porta = "h-2 w-2 rounded-[1px] border border-black/60 bg-[#0a1018]";

  if (tipo === "olt") {
    // line cards verticais + 2 SFP coloridos
    return (
      <div className="flex items-end gap-[2px] overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="h-3 w-[3px] rounded-[1px] bg-black/55" />
        ))}
        <span className="ml-1 h-2 w-2 rounded-[1px]" style={{ backgroundColor: cor }} />
        <span className="h-2 w-2 rounded-[1px]" style={{ backgroundColor: cor }} />
      </div>
    );
  }
  if (tipo === "switch" || tipo === "patch") {
    return (
      <div className="flex flex-wrap gap-[2px] overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className={porta} />
        ))}
      </div>
    );
  }
  if (tipo === "dio") {
    // adaptadores de fibra (círculos)
    return (
      <div className="flex gap-[3px] overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="h-2 w-2 rounded-full border border-black/60 bg-[#0a1018]" />
        ))}
      </div>
    );
  }
  if (tipo === "servidor") {
    return (
      <div className="flex flex-col gap-[2px] overflow-hidden">
        <span className="h-1.5 w-full rounded-[1px] bg-black/45" />
        <span className="h-1.5 w-full rounded-[1px] bg-black/45" />
      </div>
    );
  }
  if (tipo === "nobreak") {
    return (
      <div className="flex items-center gap-1.5 overflow-hidden">
        <span className="h-3 w-7 rounded-[1px] border border-black/60 bg-[#0a1018]" />
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cor }} />
      </div>
    );
  }
  return (
    <div className="flex gap-[3px] overflow-hidden">
      {Array.from({ length: 3 }).map((_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/30" />
      ))}
    </div>
  );
}
