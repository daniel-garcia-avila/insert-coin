# 🪙 INSERT COIN

Identifica, tasa y gestiona tu colección de monedas desde el móvil o el PC.

> **Estado actual: Fases 0 y 1 completadas.**
> Ya puedes entrar con contraseña, hacer las fotos del anverso y el reverso, guardarlas en tu inventario, verlas y borrarlas.
> La identificación con IA (Fase 2) y la tasación (Fase 3) llegan en las siguientes entregas.

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
2. Cuando esté listo, abre **SQL Editor → New query**, pega el contenido completo de `supabase/migrations/001_init.sql` y pulsa **Run**. Esto crea:
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
3. En **Environment Variables**, añade las mismas 4 variables de tu `.env.local`.
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

---

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
│  ├─ api/coins/[id]/route.ts  # GET una · DELETE
│  ├─ manifest.ts              # Manifiesto PWA
│  └─ layout.tsx, globals.css  # Tema, fuentes y cabecera
├─ components/                 # AppHeader, Logo, ThemeToggle, PhotoSlot, CoinCard, States…
├─ lib/
│  ├─ auth.ts                  # Cookie de sesión firmada (HMAC)
│  ├─ env.ts                   # Validación de variables de entorno
│  ├─ supabase.ts              # Cliente Supabase (solo servidor)
│  ├─ coins.ts                 # Lógica de negocio del inventario
│  ├─ image.ts                 # Compresión de fotos en el navegador
│  ├─ validation.ts            # Esquemas zod y validación de archivos
│  └─ types.ts, format.ts, ui.ts, api-client.ts, api-response.ts
├─ proxy.ts                    # Protege todas las rutas con la contraseña
├─ supabase/migrations/001_init.sql
├─ scripts/generate-icons.mjs  # Regenera los iconos de la PWA a partir de scripts/icon.svg
└─ public/                     # Iconos y service worker
```

## Seguridad

- **Claves:** `SUPABASE_SECRET_KEY` y `SESSION_SECRET` solo existen en el servidor. Ninguna variable empieza por `NEXT_PUBLIC_`, así que ninguna llega al navegador.
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

- **Fase 2: identificación.** Gemini analiza el anverso y el reverso y propone el país, el valor facial, el año, la época, el material y el estado de conservación (BC, MBC, EBC…). Tú lo revisas en un formulario editable y confirmas.
- **Fase 3: tasación.** Se cruza con Numista y se muestra un rango de precio según el estado, curiosidades y enlaces a todocoleccion, eBay y Numista.
- **Fase 4: inventario avanzado.** Búsqueda, filtros, orden, agrupación por país, época o año, y valor total de la colección.
- **Fase 5: cierre.** Despliegue final, README completo y mejoras para la v2.
