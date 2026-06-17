import { NextResponse } from "next/server";
import { listCabos, createCabo, parseCaboInput } from "@/lib/cabo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, cabos: await listCabos() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const cabo = await createCabo(parseCaboInput(await req.json()));
    return NextResponse.json({ ok: true, cabo }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("duplicate key") ? 409 : 500;
    return NextResponse.json(
      { ok: false, erro: status === 409 ? "já existe um cabo com esse código" : msg },
      { status },
    );
  }
}
