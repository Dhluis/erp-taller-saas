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
  title: "Confia Drive - Taller Automotriz",
  description: "Sistema de gestión integral para talleres automotrices con tema oscuro moderno",
  keywords: ["ERP", "Taller", "Automotriz", "Gestión", "Sistema"],
  authors: [{ name: "Confia Drive Team" }],
  creator: "Confia Drive",
  publisher: "Confia Drive",
  manifest: "/manifest.json",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "https://i.ibb.co/d4CNVSBS/conf-a-Drive-logo-con-11.png", type: "image/png" },
      { url: "https://i.ibb.co/d4CNVSBS/conf-a-Drive-logo-con-11.png", sizes: "32x32", type: "image/png" },
      { url: "https://i.ibb.co/d4CNVSBS/conf-a-Drive-logo-con-11.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "https://i.ibb.co/d4CNVSBS/conf-a-Drive-logo-con-11.png",
    apple: [
      { url: "https://i.ibb.co/d4CNVSBS/conf-a-Drive-logo-con-11.png", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Confia Drive ERP",
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


