import { NextResponse } from "next/server";
import { updateRack, deleteRack } from "@/lib/pop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: RouteContext<"/api/rack/[id]">) {
  const id = Number((await ctx.params).id);
  try {
    const b = (await req.json()) as Record<string, unknown>;
    const ok = await updateRack(id, {
      nome: typeof b.nome === "string" ? b.nome.trim() || null : null,
      alturaU: b.alturaU != null && b.alturaU !== "" ? Number(b.alturaU) : null,
      observacao: typeof b.observacao === "string" ? b.observacao.trim() || null : null,
    });
    if (!ok) return NextResponse.json({ ok: false, erro: "Rack não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/rack/[id]">) {
  const id = Number((await ctx.params).id);
  try {
    const ok = await deleteRack(id);
    if (!ok) return NextResponse.json({ ok: false, erro: "Rack não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
