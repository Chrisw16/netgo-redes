"use client";

import { useEffect, useState } from "react";
import { useMapa } from "@/components/MapaShell";

type Form = {
  codigo: string;
  tipo: string;
  fibras: string;
  fabricante: string;
  observacao: string;
};

const FORM_VAZIO: Form = { codigo: "", tipo: "", fibras: "", fabricante: "", observacao: "" };

export default function CabosPanel() {
  const { cabos, postes, recarregar, sel, setSel, setMapClick } = useMapa();
  const [mode, setMode] = useState<"idle" | "new" | "edit">("idle");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [rota, setRota] = useState<number[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // O cabo é montado clicando em postes; nada de clique em mapa vazio.
  useEffect(() => {
    setMapClick(null);
    return () => setMapClick(null);
  }, [setMapClick]);

  // Selecionar um cabo (linha ou lista) carrega para edição.
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
    setRota(c.posteIds);
  }, [sel, cabos]);

  // Com o formulário aberto, clicar num POSTE adiciona-o à rota.
  useEffect(() => {
    if (mode === "idle") return;
    if (sel?.camada !== "poste") return;
    setRota((r) => (r[r.length - 1] === sel.id ? r : [...r, sel.id]));
  }, [sel, mode]);

  function novo() {
    setSel(null);
    setMode("new");
    setEditId(null);
    setForm(FORM_VAZIO);
    setRota([]);
  }

  function cancelar() {
    setSel(null);
    setMode("idle");
    setEditId(null);
    setForm(FORM_VAZIO);
    setRota([]);
  }

  function removerDaRota(idx: number) {
    setRota((r) => r.filter((_, i) => i !== idx));
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
      posteIds: rota,
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

  const codPoste = (id: number) => postes.find((p) => p.id === id)?.codigo || `#${id}`;

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
                clique nos postes da rota.
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

            {/* Rota por postes */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--muted)]">
                  Rota ({rota.length} postes)
                </span>
                {rota.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRota([])}
                    className="text-[11px] text-[var(--muted)] hover:text-red-300"
                  >
                    limpar
                  </button>
                )}
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 text-sm">
                {rota.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">
                    Clique nos <strong className="text-[var(--text)]">postes</strong> no mapa, na
                    ordem da rota.
                  </p>
                ) : (
                  <ol className="space-y-1">
                    {rota.map((pid, idx) => (
                      <li key={`${pid}-${idx}`} className="flex items-center justify-between">
                        <span>
                          <span className="text-[var(--muted)]">{idx + 1}.</span> {codPoste(pid)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removerDaRota(idx)}
                          className="text-[var(--muted)] hover:text-red-300"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              {rota.length === 1 && (
                <p className="mt-1 text-[11px] text-amber-300">
                  Adicione ao menos 2 postes para desenhar a rota.
                </p>
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
