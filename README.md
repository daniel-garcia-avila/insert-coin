# INSERT COIN: tu colección de monedas, fotografiada y valorada

Haces una foto al anverso y al reverso de una moneda con el móvil. La IA la identifica sola (país, año, época, reinado, valor facial, metal, eventos y estado de conservación) y la app la guarda en tu inventario con un precio contrastado entre varias fuentes.

**Coste: 0 €.** Todo funciona con planes gratuitos y no hace falta tarjeta de crédito.

| Pieza | Servicio | Plan gratuito |
| --- | --- | --- |
| Inicio de sesión, base de datos, web | Firebase (plan Spark) | 1 GB de datos, 50.000 lecturas al día, hosting incluido |
| Backend que guarda tus claves | Cloudflare Workers | 100.000 peticiones al día |
| Identificación por foto | Google Gemini Flash | Varios cientos de fotos al día |
| Precio de catálogo | Numista API | Cuota gratuita con tu clave |
| Precio de mercado | eBay Browse API (eBay España) | 5.000 consultas al día |
| Valor del oro y la plata | gold-api.com | Sin clave |

Las fotos se guardan comprimidas en Firestore porque Firebase Storage y Cloud Functions ya no están disponibles en el plan gratuito (desde febrero de 2026 exigen el plan Blaze de pago).

> Aviso: en el plan gratuito de Gemini, Google puede usar las fotos que envías para mejorar sus modelos. Para monedas no suele importar, pero tenlo en cuenta.

## Pruébala antes de configurar nada

```bash
cd web
npm install
npm run dev
```

Abre http://localhost:5173. Sin claves la app arranca en **modo demostración**: verás monedas de ejemplo y podrás probar todo el flujo. Los datos se guardan solo en ese navegador.

## Puesta en marcha (unos 30 minutos)

Necesitas [Node.js](https://nodejs.org) 20 o superior.

### 1. Firebase (base de datos, cuentas y web)

1. Entra en https://console.firebase.google.com y crea un proyecto (o reutiliza uno). Deja el plan **Spark**; no actives Blaze.
2. **Authentication → Comenzar →** activa **Google** y **Correo electrónico/contraseña**.
3. **Firestore Database → Crear base de datos →** elige ubicación `eur3 (Europa)` y modo producción.
4. **Configuración del proyecto → General → Tus apps →** añade una app **Web** (icono `</>`). Copia los valores de `firebaseConfig`.
5. En la carpeta `web`, copia `.env.example` como `.env` y pega esos valores.
6. En `.firebaserc`, cambia `tu-proyecto-firebase` por el id de tu proyecto.

### 2. Claves gratuitas de las APIs

- **Gemini**: https://aistudio.google.com/apikey → *Create API key*.
- **Numista**: crea una cuenta en https://es.numista.com, luego https://es.numista.com/api/ → crea una aplicación y copia la clave. La búsqueda por imagen de Numista es de pago; no se usa.
- **eBay** (opcional pero recomendado): https://developer.ebay.com → crea una cuenta → *Application Keys* → crea un keyset de **Production**. Copia el *App ID (Client ID)* y el *Cert ID (Client Secret)*. Si eBay te pide configurar las notificaciones de cierre de cuenta, elige la opción de exención (*not persisting eBay data*), porque la app no guarda datos de usuarios de eBay.

### 3. Backend en Cloudflare

1. Crea una cuenta gratuita en https://dash.cloudflare.com.
2. Edita `worker/wrangler.toml`: pon tu `FIREBASE_PROJECT_ID` y tus dominios en `ALLOWED_ORIGINS` (`https://TU-PROYECTO.web.app`). En `ALLOWED_EMAILS` pon tu email para que nadie más pueda gastar tus cuotas gratuitas.
3. En una terminal:

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put NUMISTA_API_KEY
npx wrangler secret put EBAY_CLIENT_ID
npx wrangler secret put EBAY_CLIENT_SECRET
npx wrangler deploy
```

4. Copia la dirección que muestra al final (`https://insert-coin-api.TU-SUBDOMINIO.workers.dev`) y pégala en `VITE_API_URL` dentro de `web/.env`.
5. Comprueba que va: abre `https://insert-coin-api.TU-SUBDOMINIO.workers.dev/health` en el navegador. Debe indicar `true` en cada clave configurada.

Opcional, para gastar menos cuota de Numista y eBay: `npx wrangler kv namespace create CACHE`, pega el id en `wrangler.toml` (descomenta el bloque `kv_namespaces`) y vuelve a ejecutar `npx wrangler deploy`.

### 4. Publicar la web

```bash
npm install -g firebase-tools
firebase login
cd web && npm install && npm run build && cd ..
firebase deploy --only hosting,firestore
```

Abre `https://TU-PROYECTO.web.app` en el móvil y usa **Añadir a pantalla de inicio** para tenerla como una app.

## Cómo calcula el precio

Para cada moneda junta hasta cuatro fuentes según su estado de conservación:

1. **Numista**: precio de catálogo para la emisión y el grado (BC→F, MBC→VF, EBC→XF, SC→UNC, FDC→BU).
2. **eBay España**: precios de anuncios activos parecidos, sin lotes ni réplicas (cuartiles 25, 50 y 75).
3. **IA**: estimación de mercado en España según la foto.
4. **Metal**: valor del oro o la plata que contiene. Actúa como precio mínimo.

El valor que ves es la mediana de las fuentes, y el rango va del mínimo al máximo. En la ficha de cada moneda aparece el desglose con enlaces. Los precios se refrescan con «Actualizar precio» en la ficha o «Actualizar precios» en el resumen (las monedas con precio de más de una semana).

Limitación: la API de ventas cerradas de eBay solo está disponible para socios aprobados. Por eso se usan anuncios activos, que suelen estar algo por encima del precio final. Cada ficha incluye un enlace a las ventas cerradas de eBay para contrastarlo.

## Estructura

```
web/        App (React + Vite), funciona como PWA y sin conexión
  src/pages/       Colección, Nueva moneda, Ficha, Resumen, Acceso
  src/lib/         Firebase, fotos, llamadas al backend, modo demo
worker/     Backend (Cloudflare Workers)
  src/gemini.js    Identificación con IA
  src/numista.js   Catálogo y precios
  src/ebay.js      Anuncios de eBay
  src/metal.js     Valor del metal
  test/            Pruebas: npm test
firestore.rules   Seguridad: cada usuario solo ve lo suyo
```

## Si algún día la vendes

El modelo ya separa a cada usuario, pero los planes gratuitos no aguantan muchos usuarios ni permiten uso comercial en todos los casos (por ejemplo, el plan gratuito de Gemini). Los pasos serían: Gemini de pago, plan Blaze para guardar fotos en Storage y usar Cloud Functions, y una suscripción en la app.

Datos de catálogo: Numista.
