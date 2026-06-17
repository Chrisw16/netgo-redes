import { NextResponse } from "next/server";
import { updateCto, deleteCto, type CtoInput } from "@/lib/cto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseInput(body: Record<string, unknown>): CtoInput | string {
  const codigo = typeof body.codigo === "string" ? body.codigo.trim() : "";
  if (!codigo) return "codigo é obrigatório";
  const num = (v: unknown) =>
    v === null || v === undefined || v === "" ? null : Number(v);
  return {
    codigo,
    lat: num(body.lat),
    lng: num(body.lng),
    capacidade: num(body.capacidade),
    posteId: num(body.posteId),
    tipoSplitter: typeof body.tipoSplitter === "string" ? body.tipoSplitter : null,
    endereco: typeof body.endereco === "string" ? body.endereco : null,
    observacao: typeof body.observacao === "string" ? body.observacao : null,
  };
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/cto/[id]">) {
  const { id } = await ctx.params;
  try {
    const parsed = parseInput(await req.json());
    if (typeof parsed === "string") {
      return NextResponse.json({ ok: false, erro: parsed }, { status: 400 });
    }
    const cto = await updateCto(Number(id), parsed);
    if (!cto) return NextResponse.json({ ok: false, erro: "CTO não encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, cto });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("duplicate key") ? 409 : 500;
    return NextResponse.json({ ok: false, erro: msg }, { status });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/cto/[id]">) {
  const { id } = await ctx.params;
  try {
    const ok = await deleteCto(Number(id));
    if (!ok) return NextResponse.json({ ok: false, erro: "CTO não encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
