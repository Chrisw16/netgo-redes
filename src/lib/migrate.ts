import { readFile } from "node:fs/promises";
import path from "node:path";
import { appQuery, appDbConfigurado } from "@/lib/appdb";

/**
 * Aplica o `db/schema.sql` no banco próprio. É idempotente (CREATE/ALTER ... IF
 * NOT EXISTS), então pode rodar a cada boot sem risco. Usado pelo hook de
 * instrumentation (boot) e pela rota /api/migrate (fallback manual).
 */
export async function aplicarSchema(): Promise<string[]> {
  if (!appDbConfigurado()) throw new Error("APP_DATABASE_URL não definida");
  const sql = await readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  await appQuery(sql); // múltiplos statements num só comando (sem parâmetros)
  const tabelas = await appQuery<{ tabela: string }>(
    `SELECT table_name AS tabela FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
  );
  return tabelas.map((t) => t.tabela);
}
