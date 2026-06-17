"use client";

import { useEffect, useState } from "react";
import { RadioTower } from "lucide-react";
import { useMapa } from "@/components/MapaShell";
import { useToast } from "@/components/Toast";

type Form = {
  codigo: string;
  tipo: string;
  alturaM: string;
  dono: string;
  concessionaria: string;
  observacao: string;
  lat: number | null;
  lng: number | null;
};

const FORM_VAZIO: Form = {
  codigo: "",
  tipo: "",
  alturaM: "",
  dono: "proprio",
  concessionaria: "",
  observacao: "",
  lat: null,
  lng: null,
};

export default function PostesPanel() {
  const { postes, recarregar, sel, setSel, setPending, setMapClick } = useMapa();
  const toast = useToast();
  const [mode, setMode] = useState<"idle" | "new" | "edit">("idle");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setMapClick((lat, lng) => {
      setForm((f) => ({ ...f, lat, lng }));
      setPending({ lat, lng });
      setMode((m) => (m === "idle" ? "new" : m));
    });
    return () => setMapClick(null);
  }, [setMapClick, setPending]);

  useEffect(() => {
    if (sel?.camada !== "poste") return;
    const p = postes.find((x) => x.id === sel.id);
    if (!p) return;
    setMode("edit");
    setEditId(p.id);
    setPending(null);
    setForm({
      codigo: p.codigo ?? "",
      tipo: p.tipo ?? "",
      alturaM: p.alturaM != null ? String(p.alturaM) : "",
      dono: p.dono || "proprio",
      concessionaria: p.concessionaria ?? "",
      observacao: p.observacao ?? "",
      lat: p.lat,
      lng: p.lng,
    });
  }, [sel, postes, setPending]);

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
      alturaM: form.alturaM || null,
      dono: form.dono,
      concessionaria: form.dono === "alugado" ? form.concessionaria || null : null,
      observacao: form.observacao || null,
      lat: form.lat,
      lng: form.lng,
    };
    try {
      const r = await fetch(editId ? `/api/poste/${editId}` : "/api/poste", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro || "falha ao salvar");
      await recarregar();
      setPending(null);
      if (j.poste) setSel({ camada: "poste", id: j.poste.id });
      toast.success(mode === "edit" ? "Poste atualizado" : "Poste criado");
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
    if (!confirm("Excluir este poste?")) return;
    setSalvando(true);
    try {
      const r = await fetch(`/api/poste/${editId}`, { method: "DELETE" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro || "falha ao excluir");
      cancelar();
      await recarregar();
      toast.success("Poste excluído");
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setErro(m);
      toast.error(m);
    } finally {
      setSalvando(false);
    }
  }

  const semCoord = postes.filter((p) => p.lat == null).length;
  const alugados = postes.filter((p) => p.dono === "alugado").length;

  return (
    <div>
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <h1 className="flex items-center gap-2 font-semibold">
            <RadioTower size={16} className="text-[#f59e0b]" /> Postes
          </h1>
          <p className="text-xs text-[var(--muted)]">
            {postes.length} · {alugados} alugados · {semCoord} sem coord.
          </p>
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
            {postes.length === 0 ? (
              <li className="py-2 text-[var(--muted)]">Nenhum poste. Clique no mapa para criar.</li>
            ) : (
              postes.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setSel({ camada: "poste", id: p.id })}
                    className="flex w-full items-center justify-between py-2 text-left hover:text-[var(--accent)]"
                  >
                    <span className="font-medium">{p.codigo || "(sem código)"}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {p.dono === "alugado" ? "alugado" : "próprio"}
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
            <h2 className="font-medium">{mode === "edit" ? "Editar poste" : "Novo poste"}</h2>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Código</span>
              <input
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                className="input"
                placeholder="ex.: P-0451"
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
                  <option value="concreto">Concreto</option>
                  <option value="madeira">Madeira</option>
                  <option value="metalico">Metálico</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Altura (m)</span>
                <input
                  type="number"
                  step="0.5"
                  value={form.alturaM}
                  onChange={(e) => setForm((f) => ({ ...f, alturaM: e.target.value }))}
                  className="input"
                  placeholder="ex.: 9"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Propriedade</span>
              <select
                value={form.dono}
                onChange={(e) => setForm((f) => ({ ...f, dono: e.target.value }))}
                className="input"
              >
                <option value="proprio">Próprio</option>
                <option value="alugado">Alugado</option>
              </select>
            </label>

            {form.dono === "alugado" && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Concessionária</span>
                <input
                  value={form.concessionaria}
                  onChange={(e) => setForm((f) => ({ ...f, concessionaria: e.target.value }))}
                  className="input"
                  placeholder="ex.: Cosern / Neoenergia"
                />
              </label>
            )}

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
              {form.lat != null && form.lng != null ? (
                <>Local: {form.lat.toFixed(6)}, {form.lng.toFixed(6)} — clique no mapa para mudar.</>
              ) : (
                <>
                  Sem coordenada. <strong className="text-[var(--text)]">Clique no mapa</strong> para
                  posicionar.
                </>
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
