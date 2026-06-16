import { Pool, type QueryResultRow } from "pg";

/**
 * Pool do banco PRÓPRIO do NetGo Redes (PostgreSQL + PostGIS) — LEITURA/ESCRITA.
 *
 * É onde mora toda a planta física que o SGP não tem: postes, cabos, CEOs,
 * fusões, e a coordenada LIMPA das CTOs (tabela `cto_geo`, amarrada ao SGP pelo
 * id do splitter). Conexão via APP_DATABASE_URL.
 *
 * Pool preguiçoso para o build não exigir a variável.
 */
const globalForAppPg = globalThis as unknown as { netgoAppPool?: Pool };

export function appDbConfigurado(): boolean {
  return !!process.env.APP_DATABASE_URL;
}

function createPool(): Pool {
  const connectionString = process.env.APP_DATABASE_URL;
  if (!connectionString) {
    throw new Error("APP_DATABASE_URL não definida (banco próprio do NetGo Redes).");
  }
  return new Pool({
    connectionString,
    ssl: process.env.APP_PGSSL === "true" ? { rejectUnauthorized: false } : false,
    max: Number(process.env.APP_PG_POOL_MAX ?? 6),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getAppPool(): Pool {
  if (!globalForAppPg.netgoAppPool) {
    globalForAppPg.netgoAppPool = createPool();
  }
  return globalForAppPg.netgoAppPool;
}

/** Executa uma query no banco próprio (leitura/escrita) e devolve as linhas. */
export async function appQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await getAppPool().query<T>(text, params as never);
  return result.rows;
}
