import { appQuery } from "@/lib/appdb";

/** CEO — Caixa de Emenda Óptica (entidade nativa). */
export interface Ceo {
  id: number;
  codigo: string | null;
  lat: number | null;
  lng: number | null;
  tipo: string | null;
  capacidade: number | null; // nº de fusões suportadas
  posteId: number | null;
  observacao: string | null;
  origem: string;
}

export interface CeoInput {
  codigo?: string | null;
  lat?: number | null;
  lng?: number | null;
  tipo?: string | null;
  capacidade?: number | null;
  posteId?: number | null;
  observacao?: string | null;
}

interface Row {
  id: number;
  codigo: string | null;
  lat: number | null;
  lng: number | null;
  tipo: string | null;
  capacidade: number | null;
  poste_id: number | null;
  observacao: string | null;
  origem: string;
}

const COLS = `
  id, codigo, tipo, capacidade, poste_id, observacao, origem,
  ST_Y(geom)::float8 AS lat, ST_X(geom)::float8 AS lng`;

function toCeo(r: Row): Ceo {
  return {
    id: r.id,
    codigo: r.codigo,
    lat: r.lat,
    lng: r.lng,
    tipo: r.tipo,
    capacidade: r.capacidade,
    posteId: r.poste_id,
    observacao: r.observacao,
    origem: r.origem,
  };
}

export async function listCeos(): Promise<Ceo[]> {
  const rows = await appQuery<Row>(`SELECT ${COLS} FROM ceo ORDER BY codigo NULLS LAST, id`);
  return rows.map(toCeo);
}

export async function createCeo(input: CeoInput): Promise<Ceo> {
  const rows = await appQuery<Row>(
    `INSERT INTO ceo (codigo, geom, tipo, capacidade, poste_id, observacao, origem)
     VALUES (
       $1,
       CASE WHEN $2::float8 IS NULL OR $3::float8 IS NULL THEN NULL
            ELSE ST_SetSRID(ST_MakePoint($3::float8, $2::float8), 4326) END,
       $4, $5::int, $6::bigint, $7, 'manual'
     )
     RETURNING ${COLS}`,
    [
      input.codigo ?? null,
      input.lat ?? null,
      input.lng ?? null,
      input.tipo ?? null,
      input.capacidade ?? null,
      input.posteId ?? null,
      input.observacao ?? null,
    ],
  );
  return toCeo(rows[0]);
}

export async function updateCeo(id: number, input: CeoInput): Promise<Ceo | null> {
  const rows = await appQuery<Row>(
    `UPDATE ceo SET
       codigo = $2,
       tipo = $3,
       capacidade = $4::int,
       poste_id = $5::bigint,
       observacao = $6,
       geom = CASE WHEN $7::float8 IS NULL OR $8::float8 IS NULL THEN geom
                   ELSE ST_SetSRID(ST_MakePoint($8::float8, $7::float8), 4326) END,
       atualizado_em = now()
     WHERE id = $1
     RETURNING ${COLS}`,
    [
      id,
      input.codigo ?? null,
      input.tipo ?? null,
      input.capacidade ?? null,
      input.posteId ?? null,
      input.observacao ?? null,
      input.lat ?? null,
      input.lng ?? null,
    ],
  );
  return rows[0] ? toCeo(rows[0]) : null;
}

export async function deleteCeo(id: number): Promise<boolean> {
  const rows = await appQuery<{ id: number }>(`DELETE FROM ceo WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export function parseCeoInput(body: Record<string, unknown>): CeoInput {
  const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  return {
    codigo: str(body.codigo),
    lat: num(body.lat),
    lng: num(body.lng),
    tipo: str(body.tipo),
    capacidade: num(body.capacidade),
    posteId: num(body.posteId),
    observacao: str(body.observacao),
  };
}
