import { valueCoin } from "@/lib/valuation";
import { coinIdSchema } from "@/lib/validation";
import { handleRouteError, jsonError } from "@/lib/api-response";

export const maxDuration = 60;

/** POST /api/coins/:id/value → (re)calcula la tasación con Numista o, si no hay datos, con la IA. */
export async function POST(_request: Request, ctx: RouteContext<"/api/coins/[id]/value">) {
  try {
    const { id } = await ctx.params;
    const parsed = coinIdSchema.safeParse(id);
    if (!parsed.success) return jsonError("Moneda no encontrada.", 404);

    const coin = await valueCoin(parsed.data);
    if (!coin) return jsonError("Moneda no encontrada.", 404);
    return Response.json({ coin });
  } catch (error) {
    return handleRouteError(error);
  }
}
