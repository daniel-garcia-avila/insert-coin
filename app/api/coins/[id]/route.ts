import { deleteCoin, getCoin, updateCoin } from "@/lib/coins";
import { coinIdSchema, coinUpdateSchema } from "@/lib/validation";
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

/** PATCH /api/coins/:id → edita la ficha (revisión, confirmación, notas…). */
export async function PATCH(request: Request, ctx: RouteContext<"/api/coins/[id]">) {
  try {
    const { id } = await ctx.params;
    const parsedId = coinIdSchema.safeParse(id);
    if (!parsedId.success) return jsonError("Moneda no encontrada.", 404);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Petición no válida.", 400);
    }
    const parsed = coinUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json({ error: issue.message, field: issue.path.join(".") }, { status: 400 });
    }
    if (Object.keys(parsed.data).length === 0) return jsonError("No hay cambios que guardar.", 400);

    const coin = await updateCoin(parsedId.data, parsed.data);
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
