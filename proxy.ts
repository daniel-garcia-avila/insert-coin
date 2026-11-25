import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Protege toda la app con la contraseña única.
 * - Páginas sin sesión → redirige a /acceso
 * - API sin sesión → 401 JSON
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (verifySessionToken(token, process.env.SESSION_SECRET)) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Sesión caducada. Vuelve a entrar." }, { status: 401 });
  }

  const loginUrl = new URL("/acceso", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Todo excepto: login, API de login, estáticos de Next, iconos y archivos de la PWA.
    "/((?!acceso|api/auth|_next/static|_next/image|icons/|icon.svg|apple-icon.png|manifest.webmanifest|sw.js|robots.txt).*)",
  ],
};
