import { NextResponse } from "next/server";
import { sgpQuery } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exploração empírica do módulo `mapaftth` do SGP, para decidir a estratégia de
 * georreferenciamento da Fase 2. Roda no Coolify (que enxerga o SGP).
 * Cada probe é isolado: se um falhar (coluna/relação diferente do esperado),
 * retorna o erro sem derrubar os outros. Protegido por MIGRATE_TOKEN.
 *
 * Uso: GET /api/explore/mapaftth?token=<MIGRATE_TOKEN>
 */
async function probe<T = unknown>(sql: string, params?: unknown[]) {
  try {
    const rows = await sgpQuery(sql, params);
    return { ok: true, rows: rows as T[] };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(req: Request) {
  const expected = process.env.MIGRATE_TOKEN;
  if (!expected) {
    return NextResponse.json({ ok: false, erro: "MIGRATE_TOKEN não definido" }, { status: 403 });
  }
  if (new URL(req.url).searchParams.get("token") !== expected) {
    return NextResponse.json({ ok: false, erro: "token inválido" }, { status: 401 });
  }

  const out: Record<string, unknown> = { geradoEm: new Date().toISOString() };

  // Tipos de item (entender o vocabulário do mapa).
  out.tipoItem = await probe(
    `SELECT id, tipo, observacao FROM mapaftth_tipoitem ORDER BY id`,
  );

  // Amostra de splitters do mapa, resolvendo a coordenada via ponto->item->coord.
  out.splitterAmostra = await probe(
    `SELECT s.id, s.ponto_id, s.nome AS splitter_nome,
            i.nome AS item_nome, i.tipo_id,
            c.latitude, c.longitude
     FROM mapaftth_splitter s
     LEFT JOIN mapaftth_item i ON i.id = s.ponto_id
     LEFT JOIN mapaftth_itemcoordenada ic ON ic.item_id = i.id
     LEFT JOIN mapaftth_coordenada c ON c.id = ic.coordenada_id
     LIMIT 10`,
  );

  // Quantos splitters do mapa têm coordenada resolvível por esse caminho.
  out.splitterComCoord = await probe(
    `SELECT COUNT(*)::int total,
            COUNT(c.id)::int com_coord
     FROM mapaftth_splitter s
     LEFT JOIN mapaftth_item i ON i.id = s.ponto_id
     LEFT JOIN mapaftth_itemcoordenada ic ON ic.item_id = i.id
     LEFT JOIN mapaftth_coordenada c ON c.id = ic.coordenada_id`,
  );

  // Casamento mapaftth_splitter <-> netcore_splitter por nome/ident.
  out.casamentoPorNome = await probe(
    `WITH ms AS (
       SELECT s.id,
              lower(trim(COALESCE(NULLIF(TRIM(s.nome), ''), i.nome))) AS chave
       FROM mapaftth_splitter s
       LEFT JOIN mapaftth_item i ON i.id = s.ponto_id
     ),
     ns AS (
       SELECT DISTINCT lower(trim(ident)) AS chave
       FROM netcore_splitter
       WHERE active AND NOT is_deleted AND ports > 0
     )
     SELECT COUNT(*)::int total_mapa,
            COUNT(*) FILTER (WHERE ns.chave IS NOT NULL)::int casados
     FROM ms LEFT JOIN ns ON ns.chave = ms.chave`,
  );

  // CEOs já mapeados (têm map_ll próprio + nome + poste).
  out.ceoAmostra = await probe(
    `SELECT id, nome, map_ll, poste_id, portas, localizacao
     FROM mapaftth_ceo WHERE NOT is_deleted ORDER BY id LIMIT 10`,
  );

  // Cabos: quantos pontos de geometria cada um tem (via item->itemcoordenada).
  out.caboAmostra = await probe(
    `SELECT cab.id, cab.nome, cab.comprimento,
            COUNT(c.id)::int pontos
     FROM mapaftth_cabo cab
     LEFT JOIN mapaftth_itemcoordenada ic ON ic.item_id = cab.mapaitem_id
     LEFT JOIN mapaftth_coordenada c ON c.id = ic.coordenada_id
     WHERE NOT cab.is_deleted
     GROUP BY cab.id, cab.nome, cab.comprimento
     ORDER BY cab.id LIMIT 10`,
  );

  return NextResponse.json(out);
}
