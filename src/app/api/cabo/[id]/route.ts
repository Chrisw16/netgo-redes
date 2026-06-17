import { NextResponse } from "next/server";
import { updateCabo, deleteCabo, parseCaboInput } from "@/lib/cabo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: RouteContext<"/api/cabo/[id]">) {
  const id = Number((await ctx.params).id);
  try {
    const cabo = await updateCabo(id, parseCaboInput(await req.json()));
    if (!cabo) return NextResponse.json({ ok: false, erro: "Cabo não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, cabo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("duplicate key") ? 409 : 500;
    return NextResponse.json(
      { ok: false, erro: status === 409 ? "já existe um cabo com esse código" : msg },
      { status },
    );
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/cabo/[id]">) {
  const id = Number((await ctx.params).id);
  try {
    const ok = await deleteCabo(id);
    if (!ok) return NextResponse.json({ ok: false, erro: "Cabo não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
