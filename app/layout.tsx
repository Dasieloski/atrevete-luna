import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthInitializer } from "@/components/AuthInitializer";
import { ThemeProvider } from "@/src/lib/theme";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Atrévete Luna — Sistema de Gestión",
  description:
    "Sistema de gestión de producción, ventas, almacén y clientes para la red de distribución de Atrévete Luna en Cuba.",
  applicationName: "Atrévete Luna",
  authors: [{ name: "Atrévete Luna" }],
  keywords: [
    "Atrévete Luna",
    "gestión",
    "producción",
    "ventas",
    "almacén",
    "distribución",
    "Cuba",
  ],
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "light dark",
};

const themeBootstrap = `(function(){try{var s=localStorage.getItem('al-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=s==='dark'||(!s&&m)||s==='system'&&m;if(dark){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.style.colorScheme='light';}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full bg-canvas text-body">
        <ThemeProvider>
          <AuthInitializer>{children}</AuthInitializer>
        </ThemeProvider>
      </body>
    </html>
  );
}
