import { deleteCoin, getCoin } from "@/lib/coins";
import { coinIdSchema } from "@/lib/validation";
import { handleRouteError, jsonError } from "@/lib/api-response";

/** GET /api/coins/:id → una moneda. */
export async function GET(_request: Request, ctx: RouteContext<"/api/coins/[id]">) {
  try {
    const { id } = await ctx.params;
    const parsed = coinIdSchema.safeParse(id);
    if (!parsed.success) return jsonError("Moneda no encontrada.", 404);

    const coin = await getCoin(parsed.data);
    if (!coin) return jsonError("Moneda no encontrada.", 404);
    return Response.json({ coin });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/coins/:id → borra la moneda y sus fotos. */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/coins/[id]">) {
  try {
    const { id } = await ctx.params;
    const parsed = coinIdSchema.safeParse(id);
    if (!parsed.success) return jsonError("Moneda no encontrada.", 404);

    const deleted = await deleteCoin(parsed.data);
    if (!deleted) return jsonError("Moneda no encontrada.", 404);
    return Response.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
