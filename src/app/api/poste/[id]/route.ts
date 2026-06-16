import { NextResponse } from "next/server";
import { updatePoste, deletePoste, parsePosteInput } from "@/lib/poste";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: RouteContext<"/api/poste/[id]">) {
  const id = Number((await ctx.params).id);
  try {
    const poste = await updatePoste(id, parsePosteInput(await req.json()));
    if (!poste) return NextResponse.json({ ok: false, erro: "Poste não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, poste });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("duplicate key") ? 409 : 500;
    return NextResponse.json(
      { ok: false, erro: status === 409 ? "já existe um poste com esse código" : msg },
      { status },
    );
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/poste/[id]">) {
  const id = Number((await ctx.params).id);
  try {
    const ok = await deletePoste(id);
    if (!ok) return NextResponse.json({ ok: false, erro: "Poste não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
