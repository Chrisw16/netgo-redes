"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Cto } from "@/lib/cto";

const PlantaMap = dynamic(() => import("@/components/PlantaMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-gray-500">
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
    () => (mode === "new" && form.lat != null && form.lng != null ? { lat: form.lat, lng: form.lng } : null),
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

  function selecionar(id: number) {
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
  }

  // Clique no mapa: define a localização da CTO sendo criada/editada.
  function aoClicarMapa(lat: number, lng: number) {
    if (mode === "idle") {
      // começa uma nova CTO no ponto clicado
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
      const method = mode === "edit" ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
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
    <div className="flex h-screen flex-col bg-white text-gray-900">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">NetGo Redes — Planta</h1>
          <p className="text-xs text-gray-500">
            {ctos.length} CTOs · {ctos.length - semCoord} no mapa · {semCoord} sem coordenada
          </p>
        </div>
        <button
          onClick={novaCto}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nova CTO
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Painel */}
        <aside className="w-96 shrink-0 overflow-y-auto border-r p-4">
          {erro && (
            <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>
          )}

          {mode === "idle" ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Clique em <strong>+ Nova CTO</strong> (ou direto no mapa) para cadastrar. Clique
                num ponto verde para editar.
              </p>
              <ul className="divide-y text-sm">
                {carregando ? (
                  <li className="py-2 text-gray-500">Carregando…</li>
                ) : ctos.length === 0 ? (
                  <li className="py-2 text-gray-500">Nenhuma CTO ainda.</li>
                ) : (
                  ctos.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => selecionar(c.id)}
                        className="flex w-full items-center justify-between py-2 text-left hover:text-blue-600"
                      >
                        <span className="font-medium">{c.codigo}</span>
                        <span className="text-xs text-gray-400">
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

              <Campo label="Código *">
                <input
                  value={form.codigo}
                  onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                  className="input"
                  placeholder="ex.: NTL1-R1-01"
                  autoFocus
                />
              </Campo>

              <div className="grid grid-cols-2 gap-2">
                <Campo label="Splitter">
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
                </Campo>
                <Campo label="Portas">
                  <input
                    type="number"
                    value={form.capacidade}
                    onChange={(e) => setForm((f) => ({ ...f, capacidade: e.target.value }))}
                    className="input"
                    placeholder="ex.: 16"
                  />
                </Campo>
              </div>

              <Campo label="Endereço">
                <input
                  value={form.endereco}
                  onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                  className="input"
                />
              </Campo>

              <Campo label="Observação">
                <textarea
                  value={form.observacao}
                  onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                  className="input"
                  rows={2}
                />
              </Campo>

              <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                {form.lat != null && form.lng != null ? (
                  <>Local: {form.lat.toFixed(6)}, {form.lng.toFixed(6)} — clique no mapa para mudar.</>
                ) : (
                  <>Sem coordenada. <strong>Clique no mapa</strong> para posicionar.</>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {salvando ? "Salvando…" : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={cancelar}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                {mode === "edit" && (
                  <button
                    type="button"
                    onClick={excluir}
                    disabled={salvando}
                    className="ml-auto rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </form>
          )}
        </aside>

        {/* Mapa */}
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

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
