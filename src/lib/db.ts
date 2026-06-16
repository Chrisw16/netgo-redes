import { Pool, type QueryResultRow } from "pg";

/**
 * Pool de conexões com o PostgreSQL do SGP (banco `dbconect`) — SOMENTE LEITURA.
 *
 * O usuário do banco é read-only: aqui nunca escrevemos. Todo dado que o NetGo
 * Redes precisa GRAVAR (planta física, coordenadas limpas) vai para o banco
 * próprio em `appdb.ts`.
 *
 * Pool preguiçoso (criado só na 1ª consulta) para que importar o módulo não
 * exija a senha — assim o build não quebra. Reaproveitado entre hot-reloads do
 * Next em dev via globalThis.
 */
const globalForPg = globalThis as unknown as { netgoSgpPool?: Pool };

function createPool(): Pool {
  const password = process.env.SGP_PGPASSWORD;
  if (!password) {
    throw new Error(
      "SGP_PGPASSWORD não definida. Preencha a senha do banco do SGP no .env.local",
    );
  }

  return new Pool({
    host: process.env.SGP_PGHOST,
    port: Number(process.env.SGP_PGPORT ?? 5432),
    database: process.env.SGP_PGDATABASE,
    user: process.env.SGP_PGUSER,
    password,
    // O servidor do SGP não suporta SSL — só liga se SGP_PGSSL=true.
    ssl: process.env.SGP_PGSSL === "true" ? { rejectUnauthorized: false } : false,
    // Fuso do Brasil para datas/CURRENT_DATE saírem em horário local.
    options: "-c timezone=America/Sao_Paulo",
    max: Number(process.env.SGP_PG_POOL_MAX ?? 6),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getSgpPool(): Pool {
  if (!globalForPg.netgoSgpPool) {
    globalForPg.netgoSgpPool = createPool();
  }
  return globalForPg.netgoSgpPool;
}

/** Executa uma query no SGP (leitura) e devolve apenas as linhas, já tipadas. */
export async function sgpQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await getSgpPool().query<T>(text, params as never);
  return result.rows;
}
