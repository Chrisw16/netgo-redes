/**
 * Hook executado UMA vez quando o servidor sobe (antes de atender requisições).
 * Aplica o schema do banco automaticamente — assim não é preciso chamar
 * /api/migrate a cada deploy. O schema é idempotente.
 *
 * Falhas aqui só logam (não derrubam o boot): as tabelas normalmente já existem
 * de um boot anterior, e os pools são lazy.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.APP_DATABASE_URL) {
    console.warn("[migrate] APP_DATABASE_URL ausente — pulando migração no boot.");
    return;
  }
  try {
    const { aplicarSchema } = await import("@/lib/migrate");
    const tabelas = await aplicarSchema();
    console.log(`[migrate] schema aplicado no boot (${tabelas.length} tabelas).`);
  } catch (e) {
    console.error("[migrate] falha ao aplicar schema no boot:", e instanceof Error ? e.message : e);
  }
}
