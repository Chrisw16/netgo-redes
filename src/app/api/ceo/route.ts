import { NextResponse } from "next/server";
import { listCeos, createCeo, parseCeoInput } from "@/lib/ceo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, ceos: await listCeos() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const ceo = await createCeo(parseCeoInput(await req.json()));
    return NextResponse.json({ ok: true, ceo }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("duplicate key") ? 409 : 500;
    return NextResponse.json(
      { ok: false, erro: status === 409 ? "já existe uma CEO com esse código" : msg },
      { status },
    );
  }
}
