import { cookies } from "next/headers";
import { createSessionToken, isPasswordValid, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { loginSchema } from "@/lib/validation";
import { handleRouteError, jsonError } from "@/lib/api-response";

const FAILED_LOGIN_DELAY_MS = 800; // frena ataques de fuerza bruta sencillos

/** POST /api/auth → inicia sesión con la contraseña única. */
export async function POST(request: Request) {
  try {
    const env = getServerEnv();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Petición no válida.", 400);
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);

    if (!isPasswordValid(parsed.data.password, env.APP_PASSWORD)) {
      await new Promise((r) => setTimeout(r, FAILED_LOGIN_DELAY_MS));
      return jsonError("Contraseña incorrecta.", 401);
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, createSessionToken(env.SESSION_SECRET), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/auth → cierra sesión. */
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
