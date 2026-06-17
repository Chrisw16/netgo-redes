import { appQuery } from "@/lib/appdb";

/** CTO nativa do NetGo Redes (vive no banco próprio; SGP é opcional). */
export interface Cto {
  id: number;
  codigo: string;
  lat: number | null;
  lng: number | null;
  tipoSplitter: string | null;
  capacidade: number | null;
  endereco: string | null;
  observacao: string | null;
  posteId: number | null;
  origem: string;
  sgpSplitterId: number | null;
}

export interface CtoInput {
  codigo: string;
  lat?: number | null;
  lng?: number | null;
  tipoSplitter?: string | null;
  capacidade?: number | null;
  endereco?: string | null;
  observacao?: string | null;
  posteId?: number | null;
}

interface Row {
  id: number;
  codigo: string;
  lat: number | null;
  lng: number | null;
  tipo_splitter: string | null;
  capacidade: number | null;
  endereco: string | null;
  observacao: string | null;
  poste_id: number | null;
  origem: string;
  sgp_splitter_id: number | null;
}

const COLS = `
  id, codigo, tipo_splitter, capacidade, endereco, observacao, poste_id, origem,
  sgp_splitter_id, ST_Y(geom)::float8 AS lat, ST_X(geom)::float8 AS lng`;

function toCto(r: Row): Cto {
  return {
    id: r.id,
    codigo: r.codigo,
    lat: r.lat,
    lng: r.lng,
    tipoSplitter: r.tipo_splitter,
    capacidade: r.capacidade,
    endereco: r.endereco,
    observacao: r.observacao,
    posteId: r.poste_id,
    origem: r.origem,
    sgpSplitterId: r.sgp_splitter_id,
  };
}

export async function listCtos(): Promise<Cto[]> {
  const rows = await appQuery<Row>(`SELECT ${COLS} FROM cto ORDER BY codigo`);
  return rows.map(toCto);
}

export async function getCto(id: number): Promise<Cto | null> {
  const rows = await appQuery<Row>(`SELECT ${COLS} FROM cto WHERE id = $1`, [id]);
  return rows[0] ? toCto(rows[0]) : null;
}

export async function createCto(input: CtoInput): Promise<Cto> {
  const rows = await appQuery<Row>(
    `INSERT INTO cto (codigo, geom, tipo_splitter, capacidade, endereco, observacao, poste_id, origem)
     VALUES (
       $1,
       CASE WHEN $2::float8 IS NULL OR $3::float8 IS NULL THEN NULL
            ELSE ST_SetSRID(ST_MakePoint($3::float8, $2::float8), 4326) END,
       $4, $5::int, $6, $7, $8::bigint, 'manual'
     )
     RETURNING ${COLS}`,
    [
      input.codigo,
      input.lat ?? null,
      input.lng ?? null,
      input.tipoSplitter ?? null,
      input.capacidade ?? null,
      input.endereco ?? null,
      input.observacao ?? null,
      input.posteId ?? null,
    ],
  );
  return toCto(rows[0]);
}

export async function updateCto(id: number, input: CtoInput): Promise<Cto | null> {
  // Se lat/lng vierem nulos, mantém a geometria atual (não apaga).
  const rows = await appQuery<Row>(
    `UPDATE cto SET
       codigo = $2,
       tipo_splitter = $3,
       capacidade = $4::int,
       endereco = $5,
       observacao = $6,
       poste_id = $7::bigint,
       geom = CASE WHEN $8::float8 IS NULL OR $9::float8 IS NULL THEN geom
                   ELSE ST_SetSRID(ST_MakePoint($9::float8, $8::float8), 4326) END,
       atualizado_em = now()
     WHERE id = $1
     RETURNING ${COLS}`,
    [
      id,
      input.codigo,
      input.tipoSplitter ?? null,
      input.capacidade ?? null,
      input.endereco ?? null,
      input.observacao ?? null,
      input.posteId ?? null,
      input.lat ?? null,
      input.lng ?? null,
    ],
  );
  return rows[0] ? toCto(rows[0]) : null;
}

export async function deleteCto(id: number): Promise<boolean> {
  const rows = await appQuery<{ id: number }>(`DELETE FROM cto WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}
