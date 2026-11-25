import { identifyCoin } from "@/lib/identify";
import { coinIdSchema } from "@/lib/validation";
import { handleRouteError, jsonError } from "@/lib/api-response";

// La identificación puede tardar (descarga de fotos + IA). 60 s es el máximo del plan gratuito de Vercel.
export const maxDuration = 60;

/** POST /api/coins/:id/identify → identifica la moneda con IA y rellena su ficha (queda en borrador). */
export async function POST(_request: Request, ctx: RouteContext<"/api/coins/[id]/identify">) {
  try {
    const { id } = await ctx.params;
    const parsed = coinIdSchema.safeParse(id);
    if (!parsed.success) return jsonError("Moneda no encontrada.", 404);

    const coin = await identifyCoin(parsed.data);
    if (!coin) return jsonError("Moneda no encontrada.", 404);
    return Response.json({ coin });
  } catch (error) {
    return handleRouteError(error);
  }
}
