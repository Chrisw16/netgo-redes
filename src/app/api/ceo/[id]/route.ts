import { NextResponse } from "next/server";
import { updateCeo, deleteCeo, parseCeoInput } from "@/lib/ceo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: RouteContext<"/api/ceo/[id]">) {
  const id = Number((await ctx.params).id);
  try {
    const ceo = await updateCeo(id, parseCeoInput(await req.json()));
    if (!ceo) return NextResponse.json({ ok: false, erro: "CEO não encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, ceo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("duplicate key") ? 409 : 500;
    return NextResponse.json(
      { ok: false, erro: status === 409 ? "já existe uma CEO com esse código" : msg },
      { status },
    );
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/ceo/[id]">) {
  const id = Number((await ctx.params).id);
  try {
    const ok = await deleteCeo(id);
    if (!ok) return NextResponse.json({ ok: false, erro: "CEO não encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
