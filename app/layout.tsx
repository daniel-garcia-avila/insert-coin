import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/press-start-2p";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: { default: "INSERT COIN", template: "%s · INSERT COIN" },
  description: "Identifica, tasa y gestiona tu colección de monedas.",
  applicationName: "INSERT COIN",
  appleWebApp: { capable: true, title: "INSERT COIN", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0f" },
    { media: "(prefers-color-scheme: light)", color: "#f6f4ef" },
  ],
};

// Se ejecuta antes de pintar para evitar el parpadeo de tema. Oscuro por defecto.
const themeScript = `try{var t=localStorage.getItem('ic-theme');if(t!=='light')document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-4 sm:px-6">{children}</main>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
