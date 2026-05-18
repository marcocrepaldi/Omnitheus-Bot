import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Decodifica o payload do JWT sem verificar assinatura (suficiente para routing) */
function jwtRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const decoded = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(decoded)?.role ?? null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token    = request.cookies.get("access_token")?.value;
  const pathname = request.nextUrl.pathname;
  const isLogin  = pathname === "/login";

  // Não autenticado → login
  if (!token && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token) {
    const role = jwtRole(token);

    // Já autenticado na tela de login → redireciona
    if (isLogin) {
      return NextResponse.redirect(new URL(role === "cofre" ? "/cofre" : "/", request.url));
    }

    // Role "cofre" só pode acessar /cofre
    if (role === "cofre" && pathname !== "/cofre") {
      return NextResponse.redirect(new URL("/cofre", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
