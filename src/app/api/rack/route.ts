import { NextResponse } from "next/server";
import { createRack } from "@/lib/pop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Record<string, unknown>;
    const popId = Number(b.popId);
    if (!Number.isFinite(popId)) {
      return NextResponse.json({ ok: false, erro: "popId obrigatório" }, { status: 400 });
    }
    const { id } = await createRack({
      popId,
      nome: typeof b.nome === "string" ? b.nome.trim() || null : null,
      alturaU: b.alturaU != null && b.alturaU !== "" ? Number(b.alturaU) : null,
    });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
