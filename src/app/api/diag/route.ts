import { NextResponse } from "next/server";
import { sgpQuery } from "@/lib/db";
import { appQuery, appDbConfigurado } from "@/lib/appdb";
import { parseLL } from "@/lib/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnóstico das duas conexões:
 *  - SGP (leitura): conta CTOs e quantas têm coordenada válida.
 *  - Banco próprio: confere PostGIS e se o schema da planta existe.
 * Cada bloco é isolado: se um falhar, o outro ainda responde.
 */
export async function GET() {
  const out: Record<string, unknown> = { geradoEm: new Date().toISOString() };

  // ── SGP ────────────────────────────────────────────────────────────────
  try {
    const rows = await sgpQuery<{ map_ll: string | null }>(
      `SELECT map_ll FROM netcore_splitter
       WHERE active AND NOT is_deleted AND ports > 0`,
    );
    let comTexto = 0;
    let validas = 0;
    for (const r of rows) {
      if (r.map_ll && r.map_ll.trim() !== "") comTexto++;
      if (parseLL(r.map_ll)) validas++;
    }
    const total = rows.length;
    out.sgp = {
      ok: true,
      ctos: total,
      ctosComCoordTexto: comTexto,
      ctosCoordValida: validas,
      ctosSemCoordValida: total - validas,
      pctGeoref: total ? Math.round((validas / total) * 1000) / 10 : 0,
    };
  } catch (e) {
    out.sgp = { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }

  // ── Banco próprio (PostGIS) ──────────────────────────────────────────────
  if (!appDbConfigurado()) {
    out.appDb = { ok: false, erro: "APP_DATABASE_URL não definida" };
  } else {
    try {
      const ver = await appQuery<{ versao: string }>(`SELECT version() AS versao`);
      const disp = await appQuery<{ disponivel: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM pg_available_extensions WHERE name = 'postgis'
         ) AS disponivel`,
      );
      const ext = await appQuery<{ postgis: string }>(
        `SELECT extversion AS postgis FROM pg_extension WHERE extname = 'postgis'`,
      );
      const tabelas = await appQuery<{ tabela: string }>(
        `SELECT table_name AS tabela FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name IN ('cto_geo','poste','cabo','cabo_poste','ceo','fusao')
         ORDER BY table_name`,
      );
      out.appDb = {
        ok: true,
        serverVersion: ver[0]?.versao ?? null,
        postgisDisponivelNaImagem: disp[0]?.disponivel ?? false, // false = imagem errada
        postgis: ext[0]?.postgis ?? "NÃO criado",
        tabelas: tabelas.map((t) => t.tabela),
        schemaCompleto: tabelas.length === 6,
      };
    } catch (e) {
      out.appDb = { ok: false, erro: e instanceof Error ? e.message : String(e) };
    }
  }

  return NextResponse.json(out);
}
