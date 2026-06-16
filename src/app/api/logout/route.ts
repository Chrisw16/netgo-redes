import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
  return NextResponse.redirect(new URL("/login", req.url));
}
