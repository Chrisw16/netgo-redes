import { appQuery } from "@/lib/appdb";

/** Cabo de fibra: uma rota que liga postes em sequência (LINESTRING no PostGIS). */
export interface Cabo {
  id: number;
  codigo: string | null;
  tipo: string | null; // backbone | distribuicao | drop
  fibras: number | null;
  fabricante: string | null;
  observacao: string | null;
  comprimentoM: number | null;
  origem: string;
  posteIds: number[]; // ordem da rota
  coords: [number, number][]; // [lat,lng] ordenado (só postes com coordenada)
}

export interface CaboInput {
  codigo?: string | null;
  tipo?: string | null;
  fibras?: number | null;
  fabricante?: string | null;
  observacao?: string | null;
  posteIds: number[];
}

interface Row {
  id: number;
  codigo: string | null;
  tipo: string | null;
  fibras: number | null;
  fabricante: string | null;
  observacao: string | null;
  comprimento_m: number | null;
  origem: string;
  poste_ids: number[] | null;
  coords: { lat: number; lng: number }[] | null;
}

const BASE = `
  SELECT c.id, c.codigo, c.tipo, c.fibras, c.fabricante, c.observacao,
         c.comprimento_m, c.origem,
         COALESCE(json_agg(cp.poste_id ORDER BY cp.ordem)
                  FILTER (WHERE cp.poste_id IS NOT NULL), '[]'::json) AS poste_ids,
         COALESCE(json_agg(json_build_object('lat', ST_Y(p.geom), 'lng', ST_X(p.geom))
                  ORDER BY cp.ordem) FILTER (WHERE p.geom IS NOT NULL), '[]'::json) AS coords
  FROM cabo c
  LEFT JOIN cabo_poste cp ON cp.cabo_id = c.id
  LEFT JOIN poste p ON p.id = cp.poste_id`;

function toCabo(r: Row): Cabo {
  return {
    id: r.id,
    codigo: r.codigo,
    tipo: r.tipo,
    fibras: r.fibras,
    fabricante: r.fabricante,
    observacao: r.observacao,
    comprimentoM: r.comprimento_m,
    origem: r.origem,
    posteIds: r.poste_ids ?? [],
    coords: (r.coords ?? []).map((c) => [c.lat, c.lng] as [number, number]),
  };
}

export async function listCabos(): Promise<Cabo[]> {
  const rows = await appQuery<Row>(`${BASE} GROUP BY c.id ORDER BY c.codigo NULLS LAST, c.id`);
  return rows.map(toCabo);
}

export async function getCabo(id: number): Promise<Cabo | null> {
  const rows = await appQuery<Row>(`${BASE} WHERE c.id = $1 GROUP BY c.id`, [id]);
  return rows[0] ? toCabo(rows[0]) : null;
}

/** Regrava a sequência de postes (cabo_poste) e recalcula geometria + comprimento. */
async function definirRota(id: number, posteIds: number[]): Promise<void> {
  await appQuery(`DELETE FROM cabo_poste WHERE cabo_id = $1`, [id]);
  if (posteIds.length > 0) {
    await appQuery(
      `INSERT INTO cabo_poste (cabo_id, poste_id, ordem)
       SELECT $1, pid, ord FROM unnest($2::bigint[]) WITH ORDINALITY AS t(pid, ord)`,
      [id, posteIds],
    );
  }
  // Geometria = linha pelos postes (em ordem) que têm coordenada; precisa de >= 2.
  await appQuery(
    `UPDATE cabo c SET
       geom = sub.line,
       comprimento_m = CASE WHEN sub.line IS NULL THEN NULL
                            ELSE ST_Length(sub.line::geography) END,
       atualizado_em = now()
     FROM (
       SELECT CASE WHEN COUNT(*) >= 2 THEN ST_MakeLine(p.geom ORDER BY cp.ordem) END AS line
       FROM cabo_poste cp JOIN poste p ON p.id = cp.poste_id
       WHERE cp.cabo_id = $1 AND p.geom IS NOT NULL
     ) sub
     WHERE c.id = $1`,
    [id],
  );
}

export async function createCabo(input: CaboInput): Promise<Cabo> {
  const [{ id }] = await appQuery<{ id: number }>(
    `INSERT INTO cabo (codigo, tipo, fibras, fabricante, observacao, origem)
     VALUES ($1, $2, $3::int, $4, $5, 'manual') RETURNING id`,
    [
      input.codigo ?? null,
      input.tipo ?? null,
      input.fibras ?? null,
      input.fabricante ?? null,
      input.observacao ?? null,
    ],
  );
  await definirRota(id, input.posteIds ?? []);
  return (await getCabo(id))!;
}

export async function updateCabo(id: number, input: CaboInput): Promise<Cabo | null> {
  const rows = await appQuery<{ id: number }>(
    `UPDATE cabo SET codigo=$2, tipo=$3, fibras=$4::int, fabricante=$5, observacao=$6
     WHERE id=$1 RETURNING id`,
    [
      id,
      input.codigo ?? null,
      input.tipo ?? null,
      input.fibras ?? null,
      input.fabricante ?? null,
      input.observacao ?? null,
    ],
  );
  if (!rows[0]) return null;
  await definirRota(id, input.posteIds ?? []);
  return getCabo(id);
}

export async function deleteCabo(id: number): Promise<boolean> {
  const rows = await appQuery<{ id: number }>(`DELETE FROM cabo WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export function parseCaboInput(body: Record<string, unknown>): CaboInput {
  const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  const ids = Array.isArray(body.posteIds)
    ? body.posteIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))
    : [];
  return {
    codigo: str(body.codigo),
    tipo: str(body.tipo),
    fibras: num(body.fibras),
    fabricante: str(body.fabricante),
    observacao: str(body.observacao),
    posteIds: ids,
  };
}
