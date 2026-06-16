// Sessão do NetGo Redes em cookie assinado (HMAC-SHA256). Funciona no middleware
// Edge e no Node sem consultar o banco. Valor = "<payload b64url>.<assinatura>".
export const AUTH_COOKIE = "netgo_redes_auth";

export interface Sessao {
  u: string; // username
  a: boolean; // é admin
}

// Rotas que exigem admin (gestão de usuários).
const SO_ADMIN = ["/configuracoes", "/api/usuarios"];

export function podeAcessar(s: Sessao, pathname: string): boolean {
  if (s.a) return true; // admin acessa tudo
  return !SO_ADMIN.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// ---------- Sessão assinada (Web Crypto: Edge + Node) ----------

function b64urlEnc(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDec(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
}
function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
async function assinar(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toHex(sig);
}

export async function criarSessao(s: Sessao, secret: string): Promise<string> {
  const payload = b64urlEnc(JSON.stringify(s));
  return `${payload}.${await assinar(payload, secret)}`;
}

export async function lerSessao(value: string | undefined, secret: string): Promise<Sessao | null> {
  if (!value || !secret) return null;
  const i = value.lastIndexOf(".");
  if (i <= 0) return null;
  const payload = value.slice(0, i);
  const sig = value.slice(i + 1);
  if (sig !== (await assinar(payload, secret))) return null;
  try {
    const obj = JSON.parse(b64urlDec(payload));
    if (typeof obj.u !== "string" || typeof obj.a !== "boolean") return null;
    return { u: obj.u, a: obj.a };
  } catch {
    return null;
  }
}
