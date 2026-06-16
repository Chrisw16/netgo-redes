import { NextResponse } from "next/server";
import { listCtos, createCto, type CtoInput } from "@/lib/cto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, ctos: await listCtos() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

function parseInput(body: Record<string, unknown>): CtoInput | string {
  const codigo = typeof body.codigo === "string" ? body.codigo.trim() : "";
  if (!codigo) return "codigo é obrigatório";
  const num = (v: unknown) =>
    v === null || v === undefined || v === "" ? null : Number(v);
  return {
    codigo,
    lat: num(body.lat),
    lng: num(body.lng),
    capacidade: num(body.capacidade),
    tipoSplitter: typeof body.tipoSplitter === "string" ? body.tipoSplitter : null,
    endereco: typeof body.endereco === "string" ? body.endereco : null,
    observacao: typeof body.observacao === "string" ? body.observacao : null,
  };
}

export async function POST(req: Request) {
  try {
    const parsed = parseInput(await req.json());
    if (typeof parsed === "string") {
      return NextResponse.json({ ok: false, erro: parsed }, { status: 400 });
    }
    return NextResponse.json({ ok: true, cto: await createCto(parsed) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Violação de UNIQUE no codigo.
    const status = msg.includes("duplicate key") ? 409 : 500;
    return NextResponse.json({ ok: false, erro: msg }, { status });
  }
}
