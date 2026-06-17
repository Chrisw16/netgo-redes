"use client";

import { useEffect, useState } from "react";
import { useMapa } from "@/components/MapaShell";

type Form = {
  codigo: string;
  tipoSplitter: string;
  capacidade: string;
  observacao: string;
  posteId: string;
  lat: number | null;
  lng: number | null;
};

const FORM_VAZIO: Form = {
  codigo: "",
  tipoSplitter: "",
  capacidade: "",
  observacao: "",
  posteId: "",
  lat: null,
  lng: null,
};

export default function CtosPanel() {
  const { ctos, postes, recarregar, sel, setSel, setPending, setMapClick } = useMapa();
  const [mode, setMode] = useState<"idle" | "new" | "edit">("idle");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // A CTO não é posicionada por clique em mapa vazio: ela herda a posição do
  // poste. Garante que nenhum handler de clique vazio fique ativo nesta aba.
  useEffect(() => {
    setMapClick(null);
    return () => setMapClick(null);
  }, [setMapClick]);

  // Vincula um poste e herda a coordenada dele.
  function vincularPoste(idStr: string) {
    const p = postes.find((x) => String(x.id) === idStr);
    setForm((f) => ({
      ...f,
      posteId: idStr,
      lat: p ? p.lat : f.lat,
      lng: p ? p.lng : f.lng,
    }));
    if (p) setPending(null);
  }

  // Selecionar uma CTO (mapa/lista) carrega para edição.
  useEffect(() => {
    if (sel?.camada !== "cto") return;
    const c = ctos.find((x) => x.id === sel.id);
    if (!c) return;
    setMode("edit");
    setEditId(c.id);
    setPending(null);
    setForm({
      codigo: c.codigo,
      tipoSplitter: c.tipoSplitter ?? "",
      capacidade: c.capacidade != null ? String(c.capacidade) : "",
      observacao: c.observacao ?? "",
      posteId: c.posteId != null ? String(c.posteId) : "",
      lat: c.lat,
      lng: c.lng,
    });
  }, [sel, ctos, setPending]);

  // Com o formulário aberto, clicar num POSTE no mapa vincula e posiciona.
  useEffect(() => {
    if (mode === "idle") return;
    if (sel?.camada !== "poste") return;
    const p = postes.find((x) => x.id === sel.id);
    setForm((f) => ({
      ...f,
      posteId: String(sel.id),
      lat: p ? p.lat : f.lat,
      lng: p ? p.lng : f.lng,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, mode]);

  function novo() {
    setSel(null);
    setMode("new");
    setEditId(null);
    setForm(FORM_VAZIO);
    setPending(null);
  }

  function cancelar() {
    setSel(null);
    setMode("idle");
    setEditId(null);
    setForm(FORM_VAZIO);
    setPending(null);
  }

  async function salvar() {
    if (!form.codigo.trim()) {
      setErro("Informe o código da CTO");
      return;
    }
    setSalvando(true);
    setErro(null);
    const payload = {
      codigo: form.codigo.trim(),
      tipoSplitter: form.tipoSplitter || null,
      capacidade: form.capacidade || null,
      observacao: form.observacao || null,
      posteId: form.posteId || null,
      lat: form.lat,
      lng: form.lng,
    };
    try {
      const r = await fetch(editId ? `/api/cto/${editId}` : "/api/cto", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro || "falha ao salvar");
      await recarregar();
      if (j.cto) setSel({ camada: "cto", id: j.cto.id });
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!editId) return;
    if (!confirm("Excluir esta CTO?")) return;
    setSalvando(true);
    try {
      const r = await fetch(`/api/cto/${editId}`, { method: "DELETE" });
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

  const posteVinc = postes.find((p) => String(p.id) === form.posteId);
  const semCoord = ctos.filter((c) => c.lat == null).length;

  return (
    <div>
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <h1 className="font-semibold">CTOs</h1>
          <p className="text-xs text-[var(--muted)]">
            {ctos.length} · {semCoord} sem coordenada
          </p>
        </div>
        <button onClick={novo} className="btn-primary px-2.5 py-1.5 text-xs">
          + Nova
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
            {ctos.length === 0 ? (
              <li className="py-2 text-[var(--muted)]">
                Nenhuma CTO. Clique em <strong className="text-[var(--text)]">+ Nova</strong> e
                escolha um poste.
              </li>
            ) : (
              ctos.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSel({ camada: "cto", id: c.id })}
                    className="flex w-full items-center justify-between py-2 text-left hover:text-[var(--accent)]"
                  >
                    <span className="font-medium">{c.codigo}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {c.lat == null ? "sem mapa" : "no mapa"}
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
            <h2 className="font-medium">{mode === "edit" ? "Editar CTO" : "Nova CTO"}</h2>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Código *</span>
              <input
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                className="input"
                placeholder="ex.: NTL1-R1-01"
                autoFocus
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Splitter</span>
                <select
                  value={form.tipoSplitter}
                  onChange={(e) => setForm((f) => ({ ...f, tipoSplitter: e.target.value }))}
                  className="input"
                >
                  <option value="">—</option>
                  <option value="1:8">1:8</option>
                  <option value="1:16">1:16</option>
                  <option value="1:32">1:32</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Portas</span>
                <input
                  type="number"
                  value={form.capacidade}
                  onChange={(e) => setForm((f) => ({ ...f, capacidade: e.target.value }))}
                  className="input"
                  placeholder="ex.: 16"
                />
              </label>
            </div>

            <div>
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Poste *</span>
              <select
                value={form.posteId}
                onChange={(e) => vincularPoste(e.target.value)}
                className="input"
              >
                <option value="">— selecione —</option>
                {postes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo || `Poste #${p.id}`}
                    {p.lat == null ? " (sem coord.)" : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Ou clique num poste (âmbar) no mapa. A CTO assume a posição do poste.
              </p>
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

            <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
              {posteVinc && form.lat != null ? (
                <>
                  No poste <strong className="text-[var(--text)]">{posteVinc.codigo || `#${posteVinc.id}`}</strong>{" "}
                  · {form.lat.toFixed(6)}, {form.lng?.toFixed(6)}
                </>
              ) : posteVinc && form.lat == null ? (
                <>O poste selecionado ainda não tem coordenada. Posicione-o no módulo Postes.</>
              ) : (
                <>Selecione um poste para posicionar a CTO.</>
              )}
            </div>

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
