import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { appQuery, appDbConfigurado } from "@/lib/appdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Aplica `db/schema.sql` no banco próprio (cria extensão PostGIS + tabelas).
 * Idempotente (o schema usa IF NOT EXISTS). Protegida por MIGRATE_TOKEN.
 *
 * Uso: GET /api/migrate?token=<MIGRATE_TOKEN>
 * Pode ser removida/desabilitada depois que o schema estiver aplicado.
 */
export async function GET(req: Request) {
  const expected = process.env.MIGRATE_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, erro: "MIGRATE_TOKEN não definido no servidor" },
      { status: 403 },
    );
  }
  const token = new URL(req.url).searchParams.get("token");
  if (token !== expected) {
    return NextResponse.json({ ok: false, erro: "token inválido" }, { status: 401 });
  }
  if (!appDbConfigurado()) {
    return NextResponse.json(
      { ok: false, erro: "APP_DATABASE_URL não definida" },
      { status: 500 },
    );
  }

  try {
    const sql = await readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8");
    await appQuery(sql); // múltiplos statements num só comando (sem parâmetros)
    const tabelas = await appQuery<{ tabela: string }>(
      `SELECT table_name AS tabela FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`,
    );
    return NextResponse.json({ ok: true, aplicado: true, tabelas: tabelas.map((t) => t.tabela) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
