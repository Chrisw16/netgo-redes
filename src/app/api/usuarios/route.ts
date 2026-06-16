import { NextResponse } from "next/server";
import { listarUsuarios, criarUsuario } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Acesso já restrito a admin pelo middleware (/api/usuarios é SO_ADMIN).

export async function GET() {
  try {
    return NextResponse.json({ ok: true, usuarios: await listarUsuarios() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Record<string, unknown>;
    const username = typeof b.username === "string" ? b.username.trim() : "";
    const senha = typeof b.senha === "string" ? b.senha : "";
    const isAdmin = b.isAdmin === true;
    if (!username || !senha) {
      return NextResponse.json({ ok: false, erro: "usuário e senha são obrigatórios" }, { status: 400 });
    }
    if (senha.length < 6) {
      return NextResponse.json({ ok: false, erro: "senha deve ter ao menos 6 caracteres" }, { status: 400 });
    }
    await criarUsuario(username, senha, isAdmin);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("duplicate key") ? 409 : 500;
    return NextResponse.json(
      { ok: false, erro: status === 409 ? "já existe um usuário com esse nome" : msg },
      { status },
    );
  }
}
