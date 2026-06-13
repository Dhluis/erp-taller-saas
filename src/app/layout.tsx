import type { Metadata, Viewport } from "next"
import { Inter, Outfit } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers/Providers"
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister"
import { GlobalLayoutWrapper } from "@/components/layout/GlobalLayoutWrapper"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Eagles System - Taller Automotriz",
  description: "Sistema de gestión integral para talleres automotrices con tema oscuro moderno",
  keywords: ["ERP", "Taller", "Automotriz", "Gestión", "Sistema"],
  authors: [{ name: "Eagles System Team" }],
  creator: "Eagles System",
  publisher: "Eagles System",
  manifest: "/manifest.json",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/eagles-logo-light.png", sizes: "192x192", type: "image/png" },
      { url: "/eagles-logo-light.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/eagles-logo-light.png",
    apple: [
      { url: "/eagles-logo-light.png", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Eagles System ERP",
  },
  other: {
    "google": "notranslate",
  },
}

export const viewport: Viewport = {
  themeColor: "#00D9FF",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" translate="no" className="notranslate dark">
      <head>
        <meta name="google" content="notranslate" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#00D9FF" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased`}>
        <Providers>
          <ServiceWorkerRegister />
          <div className="min-h-screen bg-bg-primary text-text-primary">
            <GlobalLayoutWrapper>
              {children}
            </GlobalLayoutWrapper>
          </div>
        </Providers>
      </body>
    </html>
  )
}


