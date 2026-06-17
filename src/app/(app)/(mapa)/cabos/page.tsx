"use client";

import { useEffect, useRef, useState } from "react";
import { useMapa } from "@/components/MapaShell";
import type { Vertice } from "@/lib/cabo";

type Form = {
  codigo: string;
  tipo: string;
  fibras: string;
  fabricante: string;
  observacao: string;
};

const FORM_VAZIO: Form = { codigo: "", tipo: "", fibras: "", fabricante: "", observacao: "" };

export default function CabosPanel() {
  const { cabos, postes, recarregar, sel, setSel, setMapClick, setPendingLine } = useMapa();
  const [mode, setMode] = useState<"idle" | "new" | "edit">("idle");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [vertices, setVertices] = useState<Vertice[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Clique em mapa vazio = ponto livre da linha (só com o formulário aberto).
  useEffect(() => {
    setMapClick((lat, lng) => {
      if (modeRef.current === "idle") return;
      setVertices((v) => [...v, { lat, lng, posteId: null }]);
    });
    return () => setMapClick(null);
  }, [setMapClick]);

  // Espelha os vértices como "linha em construção" no mapa.
  useEffect(() => {
    setPendingLine(vertices.length ? vertices.map((v) => [v.lat, v.lng] as [number, number]) : null);
    return () => setPendingLine(null);
  }, [vertices, setPendingLine]);

  // Selecionar um cabo carrega para edição.
  useEffect(() => {
    if (sel?.camada !== "cabo") return;
    const c = cabos.find((x) => x.id === sel.id);
    if (!c) return;
    setMode("edit");
    setEditId(c.id);
    setForm({
      codigo: c.codigo ?? "",
      tipo: c.tipo ?? "",
      fibras: c.fibras != null ? String(c.fibras) : "",
      fabricante: c.fabricante ?? "",
      observacao: c.observacao ?? "",
    });
    setVertices(c.vertices);
  }, [sel, cabos]);

  // Clicar num poste (form aberto) adiciona-o como vértice âncora.
  useEffect(() => {
    if (mode === "idle") return;
    if (sel?.camada !== "poste") return;
    const p = postes.find((x) => x.id === sel.id);
    if (!p || p.lat == null || p.lng == null) return;
    setVertices((v) => {
      const last = v[v.length - 1];
      if (last && last.posteId === p.id) return v;
      return [...v, { lat: p.lat as number, lng: p.lng as number, posteId: p.id }];
    });
  }, [sel, mode, postes]);

  function novo() {
    setSel(null);
    setMode("new");
    setEditId(null);
    setForm(FORM_VAZIO);
    setVertices([]);
  }

  function cancelar() {
    setSel(null);
    setMode("idle");
    setEditId(null);
    setForm(FORM_VAZIO);
    setVertices([]);
  }

  function removerVertice(idx: number) {
    setVertices((v) => v.filter((_, i) => i !== idx));
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const payload = {
      codigo: form.codigo || null,
      tipo: form.tipo || null,
      fibras: form.fibras || null,
      fabricante: form.fabricante || null,
      observacao: form.observacao || null,
      pontos: vertices,
    };
    try {
      const r = await fetch(editId ? `/api/cabo/${editId}` : "/api/cabo", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro || "falha ao salvar");
      await recarregar();
      if (j.cabo) setSel({ camada: "cabo", id: j.cabo.id });
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!editId) return;
    if (!confirm("Excluir este cabo?")) return;
    setSalvando(true);
    try {
      const r = await fetch(`/api/cabo/${editId}`, { method: "DELETE" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro || "falha ao excluir");
      cancelar();
      await recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  const rotuloVertice = (v: Vertice) =>
    v.posteId != null
      ? postes.find((p) => p.id === v.posteId)?.codigo || `Poste #${v.posteId}`
      : "ponto livre";

  return (
    <div>
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <h1 className="font-semibold">Cabos</h1>
          <p className="text-xs text-[var(--muted)]">{cabos.length} cabos</p>
        </div>
        <button onClick={novo} className="btn-primary px-2.5 py-1.5 text-xs">
          + Novo
        </button>
      </div>

      <div className="p-4">
        {erro && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {erro}
          </div>
        )}

        {mode === "idle" ? (
          <ul className="divide-y divide-[var(--border)]/60 text-sm">
            {cabos.length === 0 ? (
              <li className="py-2 text-[var(--muted)]">
                Nenhum cabo. Clique em <strong className="text-[var(--text)]">+ Novo</strong> e
                trace a rota no mapa.
              </li>
            ) : (
              cabos.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSel({ camada: "cabo", id: c.id })}
                    className="flex w-full items-center justify-between py-2 text-left hover:text-[var(--accent)]"
                  >
                    <span className="font-medium">{c.codigo || "(sem código)"}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {c.fibras ? `${c.fibras}F` : "—"} ·{" "}
                      {c.comprimentoM != null ? `${Math.round(c.comprimentoM)} m` : "sem rota"}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              salvar();
            }}
          >
            <h2 className="font-medium">{mode === "edit" ? "Editar cabo" : "Novo cabo"}</h2>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Código</span>
              <input
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                className="input"
                placeholder="ex.: BB-01 / 12FO"
                autoFocus
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Tipo</span>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                  className="input"
                >
                  <option value="">—</option>
                  <option value="backbone">Backbone</option>
                  <option value="distribuicao">Distribuição</option>
                  <option value="drop">Drop</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Fibras</span>
                <input
                  type="number"
                  value={form.fibras}
                  onChange={(e) => setForm((f) => ({ ...f, fibras: e.target.value }))}
                  className="input"
                  placeholder="ex.: 12"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Fabricante</span>
              <input
                value={form.fabricante}
                onChange={(e) => setForm((f) => ({ ...f, fabricante: e.target.value }))}
                className="input"
              />
            </label>

            {/* Traçado da fibra */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--muted)]">
                  Traçado ({vertices.length} pontos)
                </span>
                {vertices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setVertices([])}
                    className="text-[11px] text-[var(--muted)] hover:text-red-300"
                  >
                    limpar
                  </button>
                )}
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 text-sm">
                {vertices.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">
                    Trace a fibra no mapa: clique nos <strong className="text-[var(--text)]">postes</strong>{" "}
                    (âncora) e em <strong className="text-[var(--text)]">pontos livres</strong> para
                    seguir a rua.
                  </p>
                ) : (
                  <ol className="space-y-1">
                    {vertices.map((v, idx) => (
                      <li key={idx} className="flex items-center justify-between">
                        <span>
                          <span className="text-[var(--muted)]">{idx + 1}.</span>{" "}
                          {v.posteId != null ? (
                            <span className="text-[#f59e0b]">{rotuloVertice(v)}</span>
                          ) : (
                            <span className="text-[var(--muted)]">ponto livre</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => removerVertice(idx)}
                          className="text-[var(--muted)] hover:text-red-300"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              {vertices.length === 1 && (
                <p className="mt-1 text-[11px] text-amber-300">Adicione ao menos 2 pontos.</p>
              )}
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Observação</span>
              <textarea
                value={form.observacao}
                onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                className="input"
                rows={2}
              />
            </label>

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={salvando} className="btn-primary">
                {salvando ? "Salvando…" : "Salvar"}
              </button>
              <button type="button" onClick={cancelar} className="btn">
                Cancelar
              </button>
              {mode === "edit" && (
                <button type="button" onClick={excluir} disabled={salvando} className="btn-danger ml-auto">
                  Excluir
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
