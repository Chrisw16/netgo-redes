import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { appQuery, appDbConfigurado } from "@/lib/appdb";

export { appDbConfigurado };

export interface AppUser {
  id: number;
  username: string;
  isAdmin: boolean;
  createdAt: string;
}

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  is_admin: boolean;
  created_at: string;
}

// ---------- Hash de senha (scrypt nativo, só roda no Node) ----------

export function hashSenha(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(senha, salt, 64).toString("hex")}`;
}

export function conferirSenha(senha: string, armazenado: string): boolean {
  const [salt, hash] = armazenado.split(":");
  if (!salt || !hash) return false;
  const teste = scryptSync(senha, salt, 64);
  const orig = Buffer.from(hash, "hex");
  return orig.length === teste.length && timingSafeEqual(orig, teste);
}

// ---------- Bootstrap: cria a tabela e semeia o admin na 1ª vez ----------

let prontoPromise: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  await appQuery(`
    CREATE TABLE IF NOT EXISTS app_user (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  const [{ n }] = await appQuery<{ n: number }>(`SELECT COUNT(*)::int n FROM app_user`);
  if (n === 0 && process.env.ADMIN_PASSWORD) {
    await appQuery(
      `INSERT INTO app_user (username, password_hash, is_admin)
       VALUES ($1, $2, true) ON CONFLICT (username) DO NOTHING`,
      [(process.env.ADMIN_USER ?? "admin").toLowerCase(), hashSenha(process.env.ADMIN_PASSWORD)],
    );
  }
}

/** Garante tabela + seed do admin (roda uma vez por processo). */
export function pronto(): Promise<void> {
  if (!prontoPromise) prontoPromise = bootstrap();
  return prontoPromise;
}

// ---------- Consultas / CRUD ----------

function mapear(r: UserRow): AppUser {
  return { id: r.id, username: r.username, isAdmin: r.is_admin, createdAt: r.created_at };
}

export async function listarUsuarios(): Promise<AppUser[]> {
  await pronto();
  const rows = await appQuery<UserRow>(
    `SELECT * FROM app_user ORDER BY is_admin DESC, username ASC`,
  );
  return rows.map(mapear);
}

export async function autenticar(username: string, senha: string): Promise<AppUser | null> {
  await pronto();
  const rows = await appQuery<UserRow>(`SELECT * FROM app_user WHERE username = $1`, [
    username.trim().toLowerCase(),
  ]);
  const r = rows[0];
  if (!r || !conferirSenha(senha, r.password_hash)) return null;
  return mapear(r);
}

export async function criarUsuario(username: string, senha: string, isAdmin: boolean): Promise<void> {
  await pronto();
  await appQuery(
    `INSERT INTO app_user (username, password_hash, is_admin) VALUES ($1, $2, $3)`,
    [username.trim().toLowerCase(), hashSenha(senha), isAdmin],
  );
}

export async function definirSenha(id: number, senha: string): Promise<void> {
  await pronto();
  await appQuery(`UPDATE app_user SET password_hash = $2 WHERE id = $1`, [id, hashSenha(senha)]);
}

export async function definirAdmin(id: number, isAdmin: boolean): Promise<void> {
  await pronto();
  await appQuery(`UPDATE app_user SET is_admin = $2 WHERE id = $1`, [id, isAdmin]);
}

export async function excluirUsuario(id: number): Promise<void> {
  await pronto();
  await appQuery(`DELETE FROM app_user WHERE id = $1`, [id]);
}

export async function contarAdmins(exceto?: number): Promise<number> {
  await pronto();
  const [{ n }] = await appQuery<{ n: number }>(
    `SELECT COUNT(*)::int n FROM app_user WHERE is_admin = true AND ($1::int IS NULL OR id <> $1)`,
    [exceto ?? null],
  );
  return n;
}
