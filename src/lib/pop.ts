import { appQuery } from "@/lib/appdb";

export interface RackItem {
  id: number;
  rackId: number;
  tipo: string;
  modelo: string | null;
  fabricante: string | null;
  uInicio: number;
  uTamanho: number;
  cor: string | null;
  observacao: string | null;
}

export interface Rack {
  id: number;
  popId: number;
  nome: string | null;
  alturaU: number;
  ordem: number;
  observacao: string | null;
  itens: RackItem[];
}

export interface Pop {
  id: number;
  codigo: string | null;
  nome: string | null;
  endereco: string | null;
  observacao: string | null;
  lat: number | null;
  lng: number | null;
  racksCount: number;
}

export interface PopDetalhe extends Pop {
  racks: Rack[];
}

// ---------- POP ----------

export async function listPops(): Promise<Pop[]> {
  return appQuery<Pop>(
    `SELECT p.id, p.codigo, p.nome, p.endereco, p.observacao,
            ST_Y(p.geom)::float8 AS lat, ST_X(p.geom)::float8 AS lng,
            (SELECT COUNT(*)::int FROM rack r WHERE r.pop_id = p.id) AS "racksCount"
     FROM pop p ORDER BY p.codigo NULLS LAST, p.id`,
  );
}

export async function getPopDetalhe(id: number): Promise<PopDetalhe | null> {
  const pops = await appQuery<Pop>(
    `SELECT p.id, p.codigo, p.nome, p.endereco, p.observacao,
            ST_Y(p.geom)::float8 AS lat, ST_X(p.geom)::float8 AS lng,
            (SELECT COUNT(*)::int FROM rack r WHERE r.pop_id = p.id) AS "racksCount"
     FROM pop p WHERE p.id = $1`,
    [id],
  );
  const pop = pops[0];
  if (!pop) return null;

  const racks = await appQuery<Omit<Rack, "itens">>(
    `SELECT id, pop_id AS "popId", nome, altura_u AS "alturaU", ordem, observacao
     FROM rack WHERE pop_id = $1 ORDER BY ordem, id`,
    [id],
  );
  const itens = await appQuery<RackItem>(
    `SELECT i.id, i.rack_id AS "rackId", i.tipo, i.modelo, i.fabricante,
            i.u_inicio AS "uInicio", i.u_tamanho AS "uTamanho", i.cor, i.observacao
     FROM rack_item i JOIN rack r ON r.id = i.rack_id
     WHERE r.pop_id = $1 ORDER BY i.u_inicio DESC`,
    [id],
  );
  return {
    ...pop,
    racks: racks.map((r) => ({ ...r, itens: itens.filter((it) => it.rackId === r.id) })),
  };
}

export async function createPop(input: {
  codigo?: string | null;
  nome?: string | null;
  endereco?: string | null;
  observacao?: string | null;
}): Promise<{ id: number }> {
  const rows = await appQuery<{ id: number }>(
    `INSERT INTO pop (codigo, nome, endereco, observacao) VALUES ($1, $2, $3, $4) RETURNING id`,
    [input.codigo ?? null, input.nome ?? null, input.endereco ?? null, input.observacao ?? null],
  );
  return rows[0];
}

export async function updatePop(
  id: number,
  input: { codigo?: string | null; nome?: string | null; endereco?: string | null; observacao?: string | null },
): Promise<boolean> {
  const rows = await appQuery<{ id: number }>(
    `UPDATE pop SET codigo=$2, nome=$3, endereco=$4, observacao=$5, atualizado_em=now()
     WHERE id=$1 RETURNING id`,
    [id, input.codigo ?? null, input.nome ?? null, input.endereco ?? null, input.observacao ?? null],
  );
  return rows.length > 0;
}

export async function deletePop(id: number): Promise<boolean> {
  const rows = await appQuery<{ id: number }>(`DELETE FROM pop WHERE id=$1 RETURNING id`, [id]);
  return rows.length > 0;
}

// ---------- Rack ----------

export async function createRack(input: {
  popId: number;
  nome?: string | null;
  alturaU?: number | null;
}): Promise<{ id: number }> {
  const rows = await appQuery<{ id: number }>(
    `INSERT INTO rack (pop_id, nome, altura_u,
       ordem)
     VALUES ($1, $2, COALESCE($3::int, 42),
       COALESCE((SELECT MAX(ordem) + 1 FROM rack WHERE pop_id = $1), 0))
     RETURNING id`,
    [input.popId, input.nome ?? null, input.alturaU ?? null],
  );
  return rows[0];
}

export async function updateRack(
  id: number,
  input: { nome?: string | null; alturaU?: number | null; observacao?: string | null },
): Promise<boolean> {
  const rows = await appQuery<{ id: number }>(
    `UPDATE rack SET nome=$2, altura_u=COALESCE($3::int, altura_u), observacao=$4 WHERE id=$1 RETURNING id`,
    [id, input.nome ?? null, input.alturaU ?? null, input.observacao ?? null],
  );
  return rows.length > 0;
}

export async function deleteRack(id: number): Promise<boolean> {
  const rows = await appQuery<{ id: number }>(`DELETE FROM rack WHERE id=$1 RETURNING id`, [id]);
  return rows.length > 0;
}

// ---------- Rack item ----------

export interface RackItemInput {
  rackId?: number;
  tipo?: string | null;
  modelo?: string | null;
  fabricante?: string | null;
  uInicio?: number | null;
  uTamanho?: number | null;
  cor?: string | null;
  observacao?: string | null;
}

export async function createRackItem(input: RackItemInput): Promise<{ id: number }> {
  const rows = await appQuery<{ id: number }>(
    `INSERT INTO rack_item (rack_id, tipo, modelo, fabricante, u_inicio, u_tamanho, cor, observacao)
     VALUES ($1, COALESCE($2,'outro'), $3, $4, COALESCE($5::int,1), COALESCE($6::int,1), $7, $8)
     RETURNING id`,
    [
      input.rackId,
      input.tipo ?? null,
      input.modelo ?? null,
      input.fabricante ?? null,
      input.uInicio ?? null,
      input.uTamanho ?? null,
      input.cor ?? null,
      input.observacao ?? null,
    ],
  );
  return rows[0];
}

export async function updateRackItem(id: number, input: RackItemInput): Promise<boolean> {
  const rows = await appQuery<{ id: number }>(
    `UPDATE rack_item SET tipo=COALESCE($2,'outro'), modelo=$3, fabricante=$4,
       u_inicio=COALESCE($5::int,u_inicio), u_tamanho=COALESCE($6::int,u_tamanho),
       cor=$7, observacao=$8
     WHERE id=$1 RETURNING id`,
    [
      id,
      input.tipo ?? null,
      input.modelo ?? null,
      input.fabricante ?? null,
      input.uInicio ?? null,
      input.uTamanho ?? null,
      input.cor ?? null,
      input.observacao ?? null,
    ],
  );
  return rows.length > 0;
}

export async function deleteRackItem(id: number): Promise<boolean> {
  const rows = await appQuery<{ id: number }>(`DELETE FROM rack_item WHERE id=$1 RETURNING id`, [id]);
  return rows.length > 0;
}

export function parseRackItemInput(b: Record<string, unknown>): RackItemInput {
  const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  return {
    rackId: b.rackId != null ? Number(b.rackId) : undefined,
    tipo: str(b.tipo),
    modelo: str(b.modelo),
    fabricante: str(b.fabricante),
    uInicio: num(b.uInicio),
    uTamanho: num(b.uTamanho),
    cor: str(b.cor),
    observacao: str(b.observacao),
  };
}
