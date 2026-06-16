import { cookies } from "next/headers";
import { AUTH_COOKIE, lerSessao, type Sessao } from "@/lib/auth";

/** Lê a sessão atual (em Server Components / Route Handlers). */
export async function sessaoAtual(): Promise<Sessao | null> {
  const jar = await cookies();
  return lerSessao(jar.get(AUTH_COOKIE)?.value, process.env.AUTH_TOKEN ?? "");
}
