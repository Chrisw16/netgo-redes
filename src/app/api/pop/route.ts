import { NextResponse } from "next/server";
import { listPops, createPop } from "@/lib/pop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

export async function GET() {
  try {
    return NextResponse.json({ ok: true, pops: await listPops() });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Record<string, unknown>;
    const { id } = await createPop({
      codigo: str(b.codigo),
      nome: str(b.nome),
      endereco: str(b.endereco),
      observacao: str(b.observacao),
    });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("duplicate key") ? 409 : 500;
    return NextResponse.json({ ok: false, erro: status === 409 ? "código de POP já existe" : msg }, { status });
  }
}
