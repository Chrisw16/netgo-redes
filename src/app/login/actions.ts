"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, criarSessao } from "@/lib/auth";
import { autenticar, appDbConfigurado } from "@/lib/users";

export type LoginState = { error: string | null };

export async function entrar(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const user = String(formData.get("user") ?? "").trim();
  const pass = String(formData.get("pass") ?? "");

  const secret = process.env.AUTH_TOKEN;
  if (!secret) return { error: "Login não configurado no servidor (defina AUTH_TOKEN)." };
  if (!appDbConfigurado()) return { error: "Banco do app não configurado (APP_DATABASE_URL)." };
  if (!user || !pass) return { error: "Informe usuário e senha." };

  let conta;
  try {
    conta = await autenticar(user, pass);
  } catch (e) {
    return { error: "Falha ao acessar o banco: " + (e instanceof Error ? e.message : String(e)) };
  }
  if (!conta) return { error: "Usuário ou senha inválidos." };

  // `secure` só quando a conexão é HTTPS (atrás do proxy do Coolify). Em HTTP
  // (domínio sslip.io) precisa ser false, senão o navegador descarta o cookie.
  const https = (await headers()).get("x-forwarded-proto") === "https";

  const jar = await cookies();
  jar.set(AUTH_COOKIE, await criarSessao({ u: conta.username, a: conta.isAdmin }, secret), {
    httpOnly: true,
    secure: https,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  });

  redirect("/dashboard");
}
