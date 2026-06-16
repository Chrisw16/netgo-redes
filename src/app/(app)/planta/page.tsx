"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamicImport from "next/dynamic";
import type { Cto } from "@/lib/cto";

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
  tipoSplitter: string;
  capacidade: string;
  endereco: string;
  observacao: string;
  lat: number | null;
  lng: number | null;
};

const FORM_VAZIO: Form = {
  codigo: "",
  tipoSplitter: "",
  capacidade: "",
  endereco: "",
  observacao: "",
  lat: null,
  lng: null,
};

export default function PlantaPage() {
  const [ctos, setCtos] = useState<Cto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [mode, setMode] = useState<"idle" | "new" | "edit">("idle");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/cto", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro || "falha ao listar");
      setCtos(j.ctos as Cto[]);
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

  function novaCto() {
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
      const c = ctos.find((x) => x.id === id);
      if (!c) return;
      setMode("edit");
      setSelectedId(id);
      setForm({
        codigo: c.codigo,
        tipoSplitter: c.tipoSplitter ?? "",
        capacidade: c.capacidade != null ? String(c.capacidade) : "",
        endereco: c.endereco ?? "",
        observacao: c.observacao ?? "",
        lat: c.lat,
        lng: c.lng,
      });
    },
    [ctos],
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
      endereco: form.endereco || null,
      observacao: form.observacao || null,
      lat: form.lat,
      lng: form.lng,
    };
    try {
      const url = mode === "edit" && selectedId ? `/api/cto/${selectedId}` : "/api/cto";
      const r = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro || "falha ao salvar");
      await carregar();
      if (j.cto) selecionar(j.cto.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!selectedId) return;
    if (!confirm("Excluir esta CTO?")) return;
    setSalvando(true);
    try {
      const r = await fetch(`/api/cto/${selectedId}`, { method: "DELETE" });
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

  const semCoord = ctos.filter((c) => c.lat == null).length;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <div>
          <h1 className="text-lg font-semibold">Mapa da Planta</h1>
          <p className="text-xs text-[var(--muted)]">
            {ctos.length} CTOs · {ctos.length - semCoord} no mapa · {semCoord} sem coordenada
          </p>
        </div>
        <button onClick={novaCto} className="btn-primary">
          + Nova CTO
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
                Clique em <strong className="text-[var(--text)]">+ Nova CTO</strong> (ou direto no
                mapa) para cadastrar. Clique num ponto para editar.
              </p>
              <ul className="divide-y divide-[var(--border)]/60 text-sm">
                {carregando ? (
                  <li className="py-2 text-[var(--muted)]">Carregando…</li>
                ) : ctos.length === 0 ? (
                  <li className="py-2 text-[var(--muted)]">Nenhuma CTO ainda.</li>
                ) : (
                  ctos.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => selecionar(c.id)}
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
            </div>
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

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Endereço</span>
                <input
                  value={form.endereco}
                  onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                  className="input"
                />
              </label>

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
            ctos={ctos}
            selectedId={selectedId}
            pending={pending}
            onMapClick={aoClicarMapa}
            onSelectCto={selecionar}
          />
        </main>
      </div>
    </div>
  );
}
