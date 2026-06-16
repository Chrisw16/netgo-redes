"use client";

import { useCallback, useEffect, useState } from "react";

interface AppUser {
  id: number;
  username: string;
  isAdmin: boolean;
  createdAt: string;
}

export default function UsuariosManager() {
  const [usuarios, setUsuarios] = useState<AppUser[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [novoUser, setNovoUser] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novoAdmin, setNovoAdmin] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/usuarios", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro);
      setUsuarios(j.usuarios);
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

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: novoUser, senha: novaSenha, isAdmin: novoAdmin }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro);
      setNovoUser("");
      setNovaSenha("");
      setNovoAdmin(false);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function acao(id: number, body: Record<string, unknown>, method = "PATCH") {
    setErro(null);
    try {
      const r = await fetch(`/api/usuarios/${id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  async function resetarSenha(id: number) {
    const senha = prompt("Nova senha (mínimo 6 caracteres):");
    if (!senha) return;
    await acao(id, { senha });
  }

  return (
    <div className="space-y-6">
      {erro && (
        <div className="card border-red-500/40 text-sm text-red-300">{erro}</div>
      )}

      <form onSubmit={criar} className="card grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Usuário</span>
          <input value={novoUser} onChange={(e) => setNovoUser(e.target.value)} className="input" />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Senha</span>
          <input
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className="input"
          />
        </label>
        <label className="flex items-center gap-2 sm:col-span-1">
          <input
            type="checkbox"
            checked={novoAdmin}
            onChange={(e) => setNovoAdmin(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          <span className="text-sm">Administrador</span>
        </label>
        <button type="submit" disabled={salvando} className="btn-primary sm:col-span-1">
          {salvando ? "Criando…" : "Criar usuário"}
        </button>
      </form>

      <div className="card p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
              <th className="px-4 py-3 font-medium">Criado em</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-[var(--muted)]">
                  Carregando…
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)]/60">
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3">
                    {u.isAdmin ? (
                      <span className="rounded-md bg-[var(--accent)]/20 px-2 py-0.5 text-xs text-[var(--accent)]">
                        admin
                      </span>
                    ) : (
                      <span className="text-[var(--muted)]">usuário</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => resetarSenha(u.id)} className="btn px-2 py-1 text-xs">
                        Resetar senha
                      </button>
                      <button
                        onClick={() => acao(u.id, { isAdmin: !u.isAdmin })}
                        className="btn px-2 py-1 text-xs"
                      >
                        {u.isAdmin ? "Tornar usuário" : "Tornar admin"}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir ${u.username}?`)) acao(u.id, {}, "DELETE");
                        }}
                        className="btn-danger px-2 py-1 text-xs"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
