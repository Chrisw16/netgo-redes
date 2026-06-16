import { NextResponse } from "next/server";
import { definirSenha, definirAdmin, excluirUsuario, contarAdmins, listarUsuarios } from "@/lib/users";
import { sessaoAtual } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: RouteContext<"/api/usuarios/[id]">) {
  const id = Number((await ctx.params).id);
  try {
    const b = (await req.json()) as Record<string, unknown>;

    if (typeof b.senha === "string" && b.senha) {
      if (b.senha.length < 6) {
        return NextResponse.json({ ok: false, erro: "senha muito curta" }, { status: 400 });
      }
      await definirSenha(id, b.senha);
    }

    if (typeof b.isAdmin === "boolean") {
      // Impede remover o último admin.
      if (b.isAdmin === false && (await contarAdmins(id)) === 0) {
        return NextResponse.json(
          { ok: false, erro: "não é possível remover o último admin" },
          { status: 400 },
        );
      }
      await definirAdmin(id, b.isAdmin);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/usuarios/[id]">) {
  const id = Number((await ctx.params).id);
  try {
    const s = await sessaoAtual();
    const usuarios = await listarUsuarios();
    const alvo = usuarios.find((u) => u.id === id);
    if (!alvo) return NextResponse.json({ ok: false, erro: "usuário não encontrado" }, { status: 404 });
    if (s && s.u === alvo.username) {
      return NextResponse.json({ ok: false, erro: "você não pode excluir a si mesmo" }, { status: 400 });
    }
    if (alvo.isAdmin && (await contarAdmins(id)) === 0) {
      return NextResponse.json({ ok: false, erro: "não é possível excluir o último admin" }, { status: 400 });
    }
    await excluirUsuario(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
