import { NextResponse } from "next/server";
import { aplicarSchema } from "@/lib/migrate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fallback MANUAL para aplicar `db/schema.sql`. Normalmente NÃO é necessário: o
 * schema é aplicado automaticamente no boot do servidor (ver src/instrumentation.ts).
 * Mantida para forçar a migração sem reiniciar o app. Protegida por MIGRATE_TOKEN.
 *
 * Uso: GET /api/migrate?token=<MIGRATE_TOKEN>
 */
export async function GET(req: Request) {
  const expected = process.env.MIGRATE_TOKEN;
  if (!expected) {
    return NextResponse.json({ ok: false, erro: "MIGRATE_TOKEN não definido no servidor" }, { status: 403 });
  }
  if (new URL(req.url).searchParams.get("token") !== expected) {
    return NextResponse.json({ ok: false, erro: "token inválido" }, { status: 401 });
  }
  try {
    const tabelas = await aplicarSchema();
    return NextResponse.json({ ok: true, aplicado: true, tabelas });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
