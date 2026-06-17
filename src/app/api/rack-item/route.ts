import { NextResponse } from "next/server";
import { createRackItem, parseRackItemInput } from "@/lib/pop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const input = parseRackItemInput((await req.json()) as Record<string, unknown>);
    if (!input.rackId) return NextResponse.json({ ok: false, erro: "rackId obrigatório" }, { status: 400 });
    const { id } = await createRackItem(input);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
