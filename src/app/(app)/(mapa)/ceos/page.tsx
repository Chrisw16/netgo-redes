"use client";

import { useEffect, useRef, useState } from "react";
import { GitMerge } from "lucide-react";
import { useMapa } from "@/components/MapaShell";
import { useToast } from "@/components/Toast";

type Form = {
  codigo: string;
  tipo: string;
  capacidade: string;
  posteId: string;
  observacao: string;
  lat: number | null;
  lng: number | null;
};

const FORM_VAZIO: Form = {
  codigo: "",
  tipo: "",
  capacidade: "",
  posteId: "",
  observacao: "",
  lat: null,
  lng: null,
};

export default function CeosPanel() {
  const { ceos, postes, recarregar, sel, setSel, setPending, setMapClick } = useMapa();
  const toast = useToast();
  const [mode, setMode] = useState<"idle" | "new" | "edit">("idle");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Clique em mapa vazio = CEO em ponto livre (emenda mid-span).
  useEffect(() => {
    setMapClick((lat, lng) => {
      setForm((f) => ({ ...f, lat, lng, posteId: "" }));
      setPending({ lat, lng });
      if (modeRef.current === "idle") setMode("new");
    });
    return () => setMapClick(null);
  }, [setMapClick, setPending]);

  function vincularPoste(idStr: string) {
    const p = postes.find((x) => String(x.id) === idStr);
    setForm((f) => ({ ...f, posteId: idStr, lat: p ? p.lat : f.lat, lng: p ? p.lng : f.lng }));
    if (p) setPending(null);
  }

  // Selecionar uma CEO carrega para edição.
  useEffect(() => {
    if (sel?.camada !== "ceo") return;
    const c = ceos.find((x) => x.id === sel.id);
    if (!c) return;
    setMode("edit");
    setEditId(c.id);
    setPending(null);
    setForm({
      codigo: c.codigo ?? "",
      tipo: c.tipo ?? "",
      capacidade: c.capacidade != null ? String(c.capacidade) : "",
      posteId: c.posteId != null ? String(c.posteId) : "",
      observacao: c.observacao ?? "",
      lat: c.lat,
      lng: c.lng,
    });
  }, [sel, ceos, setPending]);

  // Clicar num poste (form aberto) monta a CEO nele e herda a coordenada.
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
    setPending(null);
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
    setSalvando(true);
    setErro(null);
    const payload = {
      codigo: form.codigo || null,
      tipo: form.tipo || null,
      capacidade: form.capacidade || null,
      posteId: form.posteId || null,
      observacao: form.observacao || null,
      lat: form.lat,
      lng: form.lng,
    };
    try {
      const r = await fetch(editId ? `/api/ceo/${editId}` : "/api/ceo", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro || "falha ao salvar");
      await recarregar();
      if (j.ceo) setSel({ camada: "ceo", id: j.ceo.id });
      toast.success(editId ? "CEO atualizada" : "CEO criada");
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setErro(m);
      toast.error(m);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!editId) return;
    if (!confirm("Excluir esta CEO?")) return;
    setSalvando(true);
    try {
      const r = await fetch(`/api/ceo/${editId}`, { method: "DELETE" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro || "falha ao excluir");
      cancelar();
      await recarregar();
      toast.success("CEO excluída");
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setErro(m);
      toast.error(m);
    } finally {
      setSalvando(false);
    }
  }

  const posteVinc = postes.find((p) => String(p.id) === form.posteId);

  return (
    <div>
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <h1 className="flex items-center gap-2 font-semibold">
            <GitMerge size={16} className="text-[#a855f7]" /> CEOs
          </h1>
          <p className="text-xs text-[var(--muted)]">{ceos.length} caixas de emenda</p>
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
            {ceos.length === 0 ? (
              <li className="py-2 text-[var(--muted)]">
                Nenhuma CEO. Clique em <strong className="text-[var(--text)]">+ Nova</strong> e
                escolha um poste ou clique no mapa.
              </li>
            ) : (
              ceos.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSel({ camada: "ceo", id: c.id })}
                    className="flex w-full items-center justify-between py-2 text-left hover:text-[var(--accent)]"
                  >
                    <span className="font-medium">{c.codigo || "(sem código)"}</span>
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
            <h2 className="font-medium">{mode === "edit" ? "Editar CEO" : "Nova CEO"}</h2>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Código</span>
              <input
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                className="input"
                placeholder="ex.: CEO-P0"
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
                  <option value="aerea">Aérea</option>
                  <option value="subterranea">Subterrânea</option>
                  <option value="pedestal">Pedestal</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Fusões</span>
                <input
                  type="number"
                  value={form.capacidade}
                  onChange={(e) => setForm((f) => ({ ...f, capacidade: e.target.value }))}
                  className="input"
                  placeholder="ex.: 24"
                />
              </label>
            </div>

            <div>
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Poste</span>
              <select
                value={form.posteId}
                onChange={(e) => vincularPoste(e.target.value)}
                className="input"
              >
                <option value="">— ponto livre (mid-span) —</option>
                {postes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo || `Poste #${p.id}`}
                    {p.lat == null ? " (sem coord.)" : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Clique num poste (âmbar) para montar nele, ou no mapa para emenda mid-span.
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
              {posteVinc ? (
                <>
                  No poste <strong className="text-[var(--text)]">{posteVinc.codigo || `#${posteVinc.id}`}</strong>
                </>
              ) : form.lat != null ? (
                <>
                  Ponto livre · {form.lat.toFixed(6)}, {form.lng?.toFixed(6)}
                </>
              ) : (
                <>Sem posição. Clique num poste ou no mapa.</>
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
