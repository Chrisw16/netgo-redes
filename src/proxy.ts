import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, lerSessao, podeAcessar } from "@/lib/auth";

// Rotas públicas: login, logout e os endpoints de setup/diagnóstico (que têm
// proteção própria por token ou são só leitura de saúde).
const PUBLICAS = [
  "/login",
  "/api/logout",
  "/api/migrate",
  "/api/explore",
  "/api/diag",
  "/api/health",
];

// "Proxy" é o novo nome do antigo "middleware" no Next 16 (mesma função).
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_TOKEN ?? "";
  const sessao = await lerSessao(req.cookies.get(AUTH_COOKIE)?.value, secret);

  if (!sessao) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!podeAcessar(sessao, pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protege tudo, menos assets internos do Next e estáticos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
