import { appQuery } from "@/lib/appdb";

/** Poste nativo do NetGo Redes. */
export interface Poste {
  id: number;
  codigo: string | null;
  lat: number | null;
  lng: number | null;
  tipo: string | null;
  alturaM: number | null;
  dono: string; // proprio | alugado
  concessionaria: string | null;
  observacao: string | null;
}

export interface PosteInput {
  codigo?: string | null;
  lat?: number | null;
  lng?: number | null;
  tipo?: string | null;
  alturaM?: number | null;
  dono?: string | null;
  concessionaria?: string | null;
  observacao?: string | null;
}

interface Row {
  id: number;
  codigo: string | null;
  lat: number | null;
  lng: number | null;
  tipo: string | null;
  altura_m: number | null;
  dono: string;
  concessionaria: string | null;
  observacao: string | null;
}

const SELECT = `
  SELECT id, codigo, tipo, altura_m, dono, concessionaria, observacao,
         ST_Y(geom)::float8 AS lat, ST_X(geom)::float8 AS lng
  FROM poste`;

function toPoste(r: Row): Poste {
  return {
    id: r.id,
    codigo: r.codigo,
    lat: r.lat,
    lng: r.lng,
    tipo: r.tipo,
    alturaM: r.altura_m,
    dono: r.dono,
    concessionaria: r.concessionaria,
    observacao: r.observacao,
  };
}

export async function listPostes(): Promise<Poste[]> {
  const rows = await appQuery<Row>(`${SELECT} ORDER BY codigo NULLS LAST, id`);
  return rows.map(toPoste);
}

const RETURNING = `RETURNING id, codigo, tipo, altura_m, dono, concessionaria, observacao,
  ST_Y(geom)::float8 AS lat, ST_X(geom)::float8 AS lng`;

export async function createPoste(input: PosteInput): Promise<Poste> {
  const rows = await appQuery<Row>(
    `INSERT INTO poste (codigo, geom, tipo, altura_m, dono, concessionaria, observacao)
     VALUES (
       $1,
       CASE WHEN $2::float8 IS NULL OR $3::float8 IS NULL THEN NULL
            ELSE ST_SetSRID(ST_MakePoint($3::float8, $2::float8), 4326) END,
       $4, $5::numeric, COALESCE($6, 'proprio'), $7, $8
     )
     ${RETURNING}`,
    [
      input.codigo ?? null,
      input.lat ?? null,
      input.lng ?? null,
      input.tipo ?? null,
      input.alturaM ?? null,
      input.dono ?? null,
      input.concessionaria ?? null,
      input.observacao ?? null,
    ],
  );
  return toPoste(rows[0]);
}

export async function updatePoste(id: number, input: PosteInput): Promise<Poste | null> {
  const rows = await appQuery<Row>(
    `UPDATE poste SET
       codigo = $2,
       tipo = $3,
       altura_m = $4::numeric,
       dono = COALESCE($5, 'proprio'),
       concessionaria = $6,
       observacao = $7,
       geom = CASE WHEN $8::float8 IS NULL OR $9::float8 IS NULL THEN geom
                   ELSE ST_SetSRID(ST_MakePoint($9::float8, $8::float8), 4326) END,
       atualizado_em = now()
     WHERE id = $1
     ${RETURNING}`,
    [
      id,
      input.codigo ?? null,
      input.tipo ?? null,
      input.alturaM ?? null,
      input.dono ?? null,
      input.concessionaria ?? null,
      input.observacao ?? null,
      input.lat ?? null,
      input.lng ?? null,
    ],
  );
  return rows[0] ? toPoste(rows[0]) : null;
}

export function parsePosteInput(body: Record<string, unknown>): PosteInput {
  const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  return {
    codigo: str(body.codigo),
    lat: num(body.lat),
    lng: num(body.lng),
    tipo: str(body.tipo),
    alturaM: num(body.alturaM),
    dono: str(body.dono),
    concessionaria: str(body.concessionaria),
    observacao: str(body.observacao),
  };
}

export async function deletePoste(id: number): Promise<boolean> {
  const rows = await appQuery<{ id: number }>(`DELETE FROM poste WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}
