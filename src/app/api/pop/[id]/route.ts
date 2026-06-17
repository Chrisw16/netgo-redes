import { NextResponse } from "next/server";
import { getPopDetalhe, updatePop, deletePop } from "@/lib/pop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

export async function GET(_req: Request, ctx: RouteContext<"/api/pop/[id]">) {
  const id = Number((await ctx.params).id);
  try {
    const pop = await getPopDetalhe(id);
    if (!pop) return NextResponse.json({ ok: false, erro: "POP não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, pop });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/pop/[id]">) {
  const id = Number((await ctx.params).id);
  try {
    const b = (await req.json()) as Record<string, unknown>;
    const ok = await updatePop(id, {
      codigo: str(b.codigo),
      nome: str(b.nome),
      endereco: str(b.endereco),
      observacao: str(b.observacao),
    });
    if (!ok) return NextResponse.json({ ok: false, erro: "POP não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("duplicate key") ? 409 : 500;
    return NextResponse.json({ ok: false, erro: status === 409 ? "código de POP já existe" : msg }, { status });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/pop/[id]">) {
  const id = Number((await ctx.params).id);
  try {
    const ok = await deletePop(id);
    if (!ok) return NextResponse.json({ ok: false, erro: "POP não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
