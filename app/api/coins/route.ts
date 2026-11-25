import { createCoinFromPhotos, listCoins } from "@/lib/coins";
import { validateImageFile } from "@/lib/validation";
import { handleRouteError, jsonError } from "@/lib/api-response";

/** GET /api/coins → inventario completo, más recientes primero. */
export async function GET(request: Request) {
  void request; // acceder a la petición mantiene la ruta dinámica (sin caché)
  try {
    const coins = await listCoins();
    return Response.json({ coins });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/coins (multipart: obverse, reverse) → crea una moneda en borrador con sus dos fotos. */
export async function POST(request: Request) {
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError("No se recibieron las fotos correctamente.", 400);
    }

    const obverse = form.get("obverse");
    const reverse = form.get("reverse");
    const validationError = validateImageFile(obverse, "anverso") ?? validateImageFile(reverse, "reverso");
    if (validationError) return jsonError(validationError, 400);

    const coin = await createCoinFromPhotos(obverse as File, reverse as File);
    return Response.json({ coin }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
