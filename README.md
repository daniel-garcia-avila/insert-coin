# 🪙 INSERT COIN

Identifica, tasa y gestiona tu colección de monedas desde el móvil o el PC.

> **Estado actual: Fases 0 a 3 completadas.**
> Entras con contraseña, haces las fotos del anverso y el reverso, la IA identifica la moneda y sugiere su estado de conservación,
> la app calcula su valor de mercado según el estado, revisas la ficha y la confirmas en tu inventario.

---

## Stack (todo gratuito)

| Pieza | Tecnología | Por qué |
|---|---|---|
| App (web + móvil + escritorio) | **Next.js 16 + React 19 + TypeScript**, instalable como **PWA** | Un solo código para todas las plataformas |
| Estilos | **Tailwind CSS 4**, modo oscuro por defecto | Rápido y sin dependencias de UI |
| Base de datos y fotos | **Supabase** (Postgres + Storage), plan Free | Base de datos y fotos en el mismo sitio, sin tarjeta |
| Despliegue | **Vercel** (plan Hobby) + **GitHub** | Despliegue automático con cada `git push` |
| Identificación (Fase 2) | Google **Gemini** (plan gratuito) | Visión por IA a partir de las fotos |
| Catálogo y precios (Fase 3) | **API de Numista** (gratuita para uso personal) | Fichas oficiales y valores por estado de conservación |

---

## 1. Requisitos

- **Node.js 20.9 o superior** (recomendado 22 LTS): `node -v`
- Una cuenta gratuita en [supabase.com](https://supabase.com)
- (Para publicarla) cuentas gratuitas en [github.com](https://github.com) y [vercel.com](https://vercel.com)

## 2. Configurar Supabase (5 minutos)

1. En Supabase, pulsa **New project**. Elige un nombre (p. ej. `insert-coin`), una contraseña de base de datos y la región **West EU** o la más cercana.
2. Cuando esté listo, abre **SQL Editor → New query**, pega el contenido completo de `supabase/migrations/001_init.sql` y pulsa **Run**. Después haz lo mismo con `002_valuation.sql`. Esto crea:
   - la tabla `coins` (inventario) y `numista_cache`,
   - el bucket **privado** `coin-photos` para las fotos,
   - la seguridad (RLS activado: nadie puede leer los datos con la clave pública).
3. Ve a **Project Settings → API Keys** y copia la **Secret key** (`sb_secret_…`). En proyectos antiguos se llama **service_role**.
4. Copia también la **Project URL** (`https://xxxx.supabase.co`). La encontrarás en **Project Settings → Data API**, o en el botón **Connect**.

## 3. Instalación local

```bash
npm install
cp .env.example .env.local      # en Windows: copy .env.example .env.local
```

Edita `.env.local`:

| Variable | Qué poner |
|---|---|
| `APP_PASSWORD` | La contraseña para entrar en la app (mín. 8 caracteres) |
| `SESSION_SECRET` | Un texto aleatorio de 32+ caracteres. Genéralo con: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `SUPABASE_URL` | La Project URL de Supabase |
| `SUPABASE_SECRET_KEY` | La Secret key (o service_role) de Supabase |
| `GEMINI_API_KEY` | Clave gratuita de Google AI Studio (ver abajo). Opcional: sin ella no hay identificación automática |
| `NUMISTA_API_KEY` | Opcional. Clave gratuita de la API de Numista para usar precios de catálogo. Sin ella, la IA estima el valor |
| `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL` | Opcionales. Por defecto `gemini-3.8-flash` y, si se agota su cuota, `gemini-3.5-flash-lite` |

### Clave de Gemini (gratis)

1. Entra en [aistudio.google.com](https://aistudio.google.com) con tu cuenta de Google.
2. Pulsa **Get API key → Create API key**. No pide tarjeta.
3. Pégala en `GEMINI_API_KEY`.

⚠️ En el plan gratuito, Google puede usar lo que envías (las fotos de tus monedas) para mejorar sus productos. Los límites diarios son bajos: si se agotan, la app te avisa y puedes reintentar más tarde o rellenar la ficha a mano.

## 4. Ejecutar

```bash
npm run dev        # desarrollo → http://localhost:3000
npm run build      # compilar para producción
npm start          # servir la versión compilada
npm run lint       # revisar el código
```

### Probarlo desde el móvil en tu red local

Arranca con `npm run dev -- -H 0.0.0.0` y abre `http://IP-DE-TU-PC:3000` en el móvil.
⚠️ Por HTTP local, el botón **Hacer foto** puede abrir la galería en lugar de la cámara. Una vez desplegada en Vercel (HTTPS), la cámara funciona normalmente.

## 5. Desplegar gratis (GitHub + Vercel)

1. Crea un repositorio **privado** en GitHub y sube el código:
   ```bash
   git add -A && git commit -m "INSERT COIN v1 - fases 0 y 1"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/insert-coin.git
   git push -u origin main
   ```
2. En Vercel, pulsa **Add New → Project**, importa el repositorio y deja la configuración por defecto (detecta Next.js).
3. En **Environment Variables**, añade las variables de tu `.env.local` (las 4 obligatorias y `GEMINI_API_KEY`).
4. Pulsa **Deploy**. Tendrás una URL `https://insert-coin-xxx.vercel.app`.
5. Cada `git push` a `main` vuelve a desplegar la app.

### Instalar la app en el móvil y el PC

- **Android (Chrome):** menú ⋮ → *Instalar aplicación* / *Añadir a pantalla de inicio*.
- **iPhone (Safari):** botón Compartir → *Añadir a pantalla de inicio*.
- **PC (Chrome/Edge):** icono de instalar en la barra de direcciones.

---

## Cómo probar las Fases 0 y 1

1. Abre la app: te redirige a **/acceso**. Prueba con una contraseña incorrecta (verás el error) y luego con la correcta.
2. El inventario aparece vacío, con un mensaje y un botón para añadir tu primera moneda.
3. Pulsa **+** → **Hacer foto** (cámara trasera en el móvil) o **Galería** para el anverso y el reverso.
   El botón de guardar se activa solo cuando hay dos fotos.
4. Al guardar, vas a la ficha de la moneda (en **Borrador**) con sus fotos. Toca una foto para verla a tamaño completo.
5. Vuelve al inventario: la moneda aparece como tarjeta. Desde la ficha puedes **borrarla**, con confirmación.
6. Prueba el botón ☀️/🌙 para cambiar entre modo oscuro y claro, y el de salir para cerrar la sesión.
7. En Supabase → **Table Editor → coins** verás el registro, y en **Storage → coin-photos** las fotos comprimidas (normalmente entre 150 y 400 KB).

## Cómo probar la Fase 2 (identificación)

1. Añade una moneda real con buena luz. Al guardar, la ficha se abre y la IA empieza a analizarla sola (**ANALIZANDO MONEDA…**, entre 5 y 30 s).
2. Verás el panel **Identificación IA** con:
   - la confianza (alta, media o baja),
   - los avisos (por ejemplo, «la fecha no se lee bien»),
   - el estado sugerido y por qué,
   - otras identificaciones posibles.
3. Debajo está el formulario relleno. El estado sugerido aparece marcado con la etiqueta **IA**. Ajusta lo que haga falta.
4. **Guardar borrador** guarda los datos sin confirmar la moneda. **Confirmar moneda** la pasa a tu colección.
5. Una moneda confirmada muestra su ficha completa. Desde ahí puedes **Editar ficha** o pulsar **Volver a identificar**.
6. Comprueba la validación: escribe letras en «Año» o un año futuro y verás el error junto al campo.
7. Sin `GEMINI_API_KEY`, o con la cuota agotada, verás un aviso claro con las opciones **Reintentar** y **Rellenar a mano**.

---

## Cómo funciona la tasación (Fase 3)

Al terminar la identificación, la app calcula el valor automáticamente. También puedes pulsar **Calcular valor** o **Actualizar valor** en cualquier momento.

1. **Precios de catálogo de Numista**, si hay `NUMISTA_API_KEY`. Busca la moneda en el catálogo y elige la emisión de su año: la ceca o, en las pesetas, el año de las estrellas. Después toma sus precios por estado y los traduce a la escala española (G→MC, VG→RC, F→BC, VF→MBC, XF→EBC, AU/UNC→SC, UNC→FDC). Las respuestas se guardan 30–90 días en `numista_cache` para no gastar cuota.
2. **Estimación de la IA**, si no hay clave de Numista, no encuentra la moneda o no tiene precios. Gemini estima el precio por estado y lo explica con una nota. Se marca como «Estimación IA».

El **rango** que se muestra corresponde al estado de la moneda: va del punto medio con el estado inferior al punto medio con el superior. Si cambias el estado en el formulario, el valor se recalcula al momento, sin nuevas consultas.

Cada moneda incluye enlaces para contrastar precios reales: ficha o búsqueda en Numista, anuncios en todocoleccion, **vendidas** en eBay y subastas en Catawiki. El inventario muestra el **valor estimado total** de la colección, teniendo en cuenta la cantidad de cada moneda.

⚠️ Son valores **orientativos**. Los catálogos y la IA pueden desviarse del precio real, sobre todo en piezas raras o con variantes.

## Estructura del proyecto

```
insert-coin/
├─ app/
│  ├─ page.tsx                 # Inventario
│  ├─ nueva/page.tsx           # Captura de fotos (anverso + reverso)
│  ├─ moneda/[id]/page.tsx     # Ficha de la moneda
│  ├─ acceso/page.tsx          # Pantalla de contraseña
│  ├─ api/auth/route.ts        # Login / logout
│  ├─ api/coins/route.ts       # GET lista · POST nueva moneda (multipart)
│  ├─ api/coins/[id]/route.ts  # GET una · PATCH editar/confirmar · DELETE
│  ├─ api/coins/[id]/identify/route.ts  # POST identificar con IA
│  ├─ api/coins/[id]/value/route.ts     # POST calcular/actualizar valor
│  ├─ manifest.ts              # Manifiesto PWA
│  └─ layout.tsx, globals.css  # Tema, fuentes y cabecera
├─ components/                 # AppHeader, Logo, ThemeToggle, PhotoSlot, CoinCard, CoinForm, GradeSelector, AiPanel, States…
├─ lib/
│  ├─ auth.ts                  # Cookie de sesión firmada (HMAC)
│  ├─ env.ts                   # Validación de variables de entorno
│  ├─ supabase.ts              # Cliente Supabase (solo servidor)
│  ├─ coins.ts                 # Lógica de negocio del inventario
│  ├─ gemini.ts                # Llamada a Gemini con respuesta JSON estructurada y modelo de reserva
│  ├─ identify.ts              # Identificar una moneda y rellenar su ficha
│  ├─ numista.ts               # Cliente de la API de Numista con caché
│  ├─ valuation.ts             # Tasación: Numista → estimación IA
│  ├─ valuation-math.ts        # Rango de valor por estado y enlaces de venta
│  ├─ image.ts                 # Compresión de fotos en el navegador
│  ├─ validation.ts            # Esquemas zod y validación de archivos
│  └─ types.ts, format.ts, ui.ts, api-client.ts, api-response.ts
├─ proxy.ts                    # Protege todas las rutas con la contraseña
├─ supabase/migrations/001_init.sql
├─ scripts/generate-icons.mjs  # Regenera los iconos de la PWA a partir de scripts/icon.svg
└─ public/                     # Iconos y service worker
```

## Región

`vercel.json` fija las funciones del servidor en París (`cdg1`), junto a la base de datos de Supabase (`eu-west-3`), para que la app responda más rápido.

## Seguridad

- **Claves:** `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY` y `SESSION_SECRET` solo existen en el servidor. Ninguna variable empieza por `NEXT_PUBLIC_`, así que ninguna llega al navegador.
- **`.env.local` nunca se sube a Git** (está en `.gitignore`). Si alguna vez se filtra una clave, regenérala en Supabase.
- **Datos:** RLS activado sin políticas, así que solo el servidor puede leer y escribir. Las fotos están en un bucket privado y se muestran con URLs firmadas que caducan en 1 hora.
- **Acceso:** contraseña única con cookie `httpOnly`, firmada y con caducidad de 30 días. Los intentos fallidos tienen un retardo para frenar ataques de fuerza bruta. Usa una contraseña larga.
- **Limitación conocida de la v1:** no hay usuarios ni bloqueo de IP tras muchos intentos. Para la v2 se usará Supabase Auth.

## Límites de los planes gratuitos

- **Supabase Free:** 500 MB de base de datos y 1 GB de almacenamiento de archivos (miles de monedas con las fotos comprimidas). **El proyecto se pausa tras unos 7 días sin actividad.** Se reactiva desde el panel sin perder datos.
- **Vercel Hobby:** solo para uso personal y no comercial. Si más adelante vendes la app como servicio, tendrás que pasar al plan Pro.

## Solución de problemas

| Síntoma | Causa / solución |
|---|---|
| «El servidor no está configurado…» | Falta o es incorrecta alguna variable en `.env.local` (o en Vercel). Revisa la consola del servidor. |
| «No se pudo cargar el inventario» | El SQL no se ejecutó, la URL o la clave de Supabase son incorrectas, o el proyecto está pausado. |
| «No se pudieron guardar las fotos» | No existe el bucket `coin-photos`. Vuelve a ejecutar `001_init.sql`. |
| La foto HEIC del iPhone no se lee | Ajustes › Cámara › Formatos › **Más compatible**, o usa el botón *Hacer foto* (Safari la convierte a JPEG). |

---

## Próximas fases

- **Fase 4: inventario avanzado.** Búsqueda, filtros, orden, agrupación por país, época o año, y valor total de la colección.
- **Fase 5: cierre.** Despliegue final, README completo y mejoras para la v2.
