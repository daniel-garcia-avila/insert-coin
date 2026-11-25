/** Pequeño cliente HTTP para el navegador con mensajes de error en castellano. */

export class ApiClientError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, { cache: "no-store", ...init });
  } catch {
    throw new ApiClientError("Sin conexión. Comprueba tu red e inténtalo de nuevo.", 0);
  }

  if (response.status === 401 && !input.startsWith("/api/auth")) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    // Recarga completa a propósito: limpia el estado de la app al caducar la sesión.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/acceso?next=${next}`;
    throw new ApiClientError("Sesión caducada.", 401);
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Respuesta sin JSON (p. ej. error 413 del servidor)
  }

  if (!response.ok) {
    const serverMessage =
      data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : null;
    const message =
      serverMessage ??
      (response.status === 413 ? "Las fotos son demasiado grandes." : `Error del servidor (${response.status}).`);
    throw new ApiClientError(message, response.status);
  }
  return data as T;
}
