import { appQuery } from "@/lib/appdb";

/** Vértice da rota do cabo: um ponto da linha, opcionalmente ancorado num poste. */
export interface Vertice {
  lat: number;
  lng: number;
  posteId: number | null;
}

/** Cabo de fibra: linha desenhada (LINESTRING) com vértices livres e/ou em postes. */
export interface Cabo {
  id: number;
  codigo: string | null;
  tipo: string | null; // backbone | distribuicao | drop
  fibras: number | null;
  fabricante: string | null;
  observacao: string | null;
  comprimentoM: number | null;
  origem: string;
  posteIds: number[];
  coords: [number, number][]; // [lat,lng] da linha
  vertices: Vertice[];
}

export interface CaboInput {
  codigo?: string | null;
  tipo?: string | null;
  fibras?: number | null;
  fabricante?: string | null;
  observacao?: string | null;
  pontos: Vertice[];
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
  geojson: string | null;
  postes: { posteId: number; ordem: number }[] | null;
}

const BASE = `
  SELECT c.id, c.codigo, c.tipo, c.fibras, c.fabricante, c.observacao,
         c.comprimento_m, c.origem,
         ST_AsGeoJSON(c.geom) AS geojson,
         COALESCE((
           SELECT json_agg(json_build_object('posteId', cp.poste_id, 'ordem', cp.ordem)
                           ORDER BY cp.ordem)
           FROM cabo_poste cp WHERE cp.cabo_id = c.id
         ), '[]'::json) AS postes
  FROM cabo c`;

function toCabo(r: Row): Cabo {
  const coords: [number, number][] = r.geojson
    ? (JSON.parse(r.geojson).coordinates as [number, number][]).map(
        ([lng, lat]) => [lat, lng] as [number, number],
      )
    : [];
  const postes = r.postes ?? [];
  const byOrdem = new Map(postes.map((p) => [p.ordem, p.posteId]));
  const vertices: Vertice[] = coords.map(([lat, lng], i) => ({
    lat,
    lng,
    posteId: byOrdem.get(i + 1) ?? null,
  }));
  return {
    id: r.id,
    codigo: r.codigo,
    tipo: r.tipo,
    fibras: r.fibras,
    fabricante: r.fabricante,
    observacao: r.observacao,
    comprimentoM: r.comprimento_m,
    origem: r.origem,
    posteIds: postes.map((p) => p.posteId),
    coords,
    vertices,
  };
}

export async function listCabos(): Promise<Cabo[]> {
  const rows = await appQuery<Row>(`${BASE} ORDER BY c.codigo NULLS LAST, c.id`);
  return rows.map(toCabo);
}

export async function getCabo(id: number): Promise<Cabo | null> {
  const rows = await appQuery<Row>(`${BASE} WHERE c.id = $1`, [id]);
  return rows[0] ? toCabo(rows[0]) : null;
}

/** Regrava geometria (linha desenhada) e os postes-âncora (cabo_poste). */
async function definirRota(id: number, pontos: Vertice[]): Promise<void> {
  await appQuery(`DELETE FROM cabo_poste WHERE cabo_id = $1`, [id]);

  if (pontos.length >= 2) {
    const wkt = `LINESTRING(${pontos.map((p) => `${p.lng} ${p.lat}`).join(",")})`;
    await appQuery(
      `UPDATE cabo SET geom = ST_GeomFromText($2, 4326),
         comprimento_m = ST_Length(ST_GeomFromText($2, 4326)::geography),
         atualizado_em = now()
       WHERE id = $1`,
      [id, wkt],
    );
  } else {
    await appQuery(`UPDATE cabo SET geom = NULL, comprimento_m = NULL, atualizado_em = now() WHERE id = $1`, [id]);
  }

  const pids: number[] = [];
  const ords: number[] = [];
  pontos.forEach((p, i) => {
    if (p.posteId != null) {
      pids.push(p.posteId);
      ords.push(i + 1);
    }
  });
  if (pids.length > 0) {
    await appQuery(
      `INSERT INTO cabo_poste (cabo_id, poste_id, ordem)
       SELECT $1, pid, ord FROM unnest($2::bigint[], $3::int[]) AS t(pid, ord)`,
      [id, pids, ords],
    );
  }
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
  await definirRota(id, input.pontos ?? []);
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
  await definirRota(id, input.pontos ?? []);
  return getCabo(id);
}

export async function deleteCabo(id: number): Promise<boolean> {
  const rows = await appQuery<{ id: number }>(`DELETE FROM cabo WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export function parseCaboInput(body: Record<string, unknown>): CaboInput {
  const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  const pontos: Vertice[] = Array.isArray(body.pontos)
    ? (body.pontos as Record<string, unknown>[])
        .map((v) => ({
          lat: Number(v.lat),
          lng: Number(v.lng),
          posteId: v.posteId != null ? Number(v.posteId) : null,
        }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    : [];
  return {
    codigo: str(body.codigo),
    tipo: str(body.tipo),
    fibras: num(body.fibras),
    fabricante: str(body.fabricante),
    observacao: str(body.observacao),
    pontos,
  };
}
