import UsuariosManager from "@/components/UsuariosManager";

export const dynamic = "force-dynamic";

export default function ConfiguracoesPage() {
  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-[var(--muted)]">Gestão de usuários do sistema (somente admin).</p>
      </header>
      <UsuariosManager />
    </div>
  );
}
