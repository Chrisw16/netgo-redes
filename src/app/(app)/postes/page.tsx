"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamicImport from "next/dynamic";
import type { Poste } from "@/lib/poste";

const PlantaMap = dynamicImport(() => import("@/components/PlantaMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
      Carregando mapa…
    </div>
  ),
});

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

const COR = "#f59e0b"; // âmbar para postes

export default function PostesPage() {
  const [postes, setPostes] = useState<Poste[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [mode, setMode] = useState<"idle" | "new" | "edit">("idle");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/poste", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro || "falha ao listar");
      setPostes(j.postes as Poste[]);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const pending = useMemo(
    () =>
      mode === "new" && form.lat != null && form.lng != null
        ? { lat: form.lat, lng: form.lng }
        : null,
    [mode, form.lat, form.lng],
  );

  function novo() {
    setMode("new");
    setSelectedId(null);
    setForm(FORM_VAZIO);
  }

  function cancelar() {
    setMode("idle");
    setSelectedId(null);
    setForm(FORM_VAZIO);
  }

  const selecionar = useCallback(
    (id: number) => {
      const p = postes.find((x) => x.id === id);
      if (!p) return;
      setMode("edit");
      setSelectedId(id);
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
    },
    [postes],
  );

  function aoClicarMapa(lat: number, lng: number) {
    if (mode === "idle") {
      setMode("new");
      setSelectedId(null);
      setForm({ ...FORM_VAZIO, lat, lng });
    } else {
      setForm((f) => ({ ...f, lat, lng }));
    }
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
      const url = mode === "edit" && selectedId ? `/api/poste/${selectedId}` : "/api/poste";
      const r = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro || "falha ao salvar");
      await carregar();
      if (j.poste) selecionar(j.poste.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!selectedId) return;
    if (!confirm("Excluir este poste?")) return;
    setSalvando(true);
    try {
      const r = await fetch(`/api/poste/${selectedId}`, { method: "DELETE" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro || "falha ao excluir");
      cancelar();
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  const semCoord = postes.filter((p) => p.lat == null).length;
  const alugados = postes.filter((p) => p.dono === "alugado").length;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <div>
          <h1 className="text-lg font-semibold">Postes</h1>
          <p className="text-xs text-[var(--muted)]">
            {postes.length} postes · {postes.length - semCoord} no mapa · {alugados} alugados
          </p>
        </div>
        <button onClick={novo} className="btn-primary">
          + Novo poste
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-80 shrink-0 overflow-y-auto border-r border-[var(--border)] p-4">
          {erro && (
            <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {erro}
            </div>
          )}

          {mode === "idle" ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--muted)]">
                Clique em <strong className="text-[var(--text)]">+ Novo poste</strong> (ou direto no
                mapa) para cadastrar. Clique num ponto para editar.
              </p>
              <ul className="divide-y divide-[var(--border)]/60 text-sm">
                {carregando ? (
                  <li className="py-2 text-[var(--muted)]">Carregando…</li>
                ) : postes.length === 0 ? (
                  <li className="py-2 text-[var(--muted)]">Nenhum poste ainda.</li>
                ) : (
                  postes.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => selecionar(p.id)}
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
            </div>
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
                  <span className="mb-1 block text-xs font-medium text-[var(--muted)]">
                    Concessionária
                  </span>
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
                  <>
                    Local: {form.lat.toFixed(6)}, {form.lng.toFixed(6)} — clique no mapa para mudar.
                  </>
                ) : (
                  <>
                    Sem coordenada. <strong className="text-[var(--text)]">Clique no mapa</strong>{" "}
                    para posicionar.
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
        </aside>

        <main className="min-w-0 flex-1">
          <PlantaMap
            camadas={[{ chave: "poste", pontos: postes, cor: COR }]}
            selecionado={selectedId ? { camada: "poste", id: selectedId } : null}
            pending={pending}
            onMapClick={aoClicarMapa}
            onSelect={(_, id) => selecionar(id)}
          />
        </main>
      </div>
    </div>
  );
}
