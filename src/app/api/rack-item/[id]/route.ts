import { NextResponse } from "next/server";
import { updateRackItem, deleteRackItem, parseRackItemInput } from "@/lib/pop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: RouteContext<"/api/rack-item/[id]">) {
  const id = Number((await ctx.params).id);
  try {
    const ok = await updateRackItem(id, parseRackItemInput((await req.json()) as Record<string, unknown>));
    if (!ok) return NextResponse.json({ ok: false, erro: "Item não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/rack-item/[id]">) {
  const id = Number((await ctx.params).id);
  try {
    const ok = await deleteRackItem(id);
    if (!ok) return NextResponse.json({ ok: false, erro: "Item não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
