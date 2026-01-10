import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers/Providers"
import { LandingPageThemeFix } from "@/components/landing-page/LandingPageThemeFix"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "EAGLES - ERP Taller Automotriz",
  description: "Sistema de gestión integral para talleres automotrices con tema oscuro moderno",
  keywords: ["ERP", "Taller", "Automotriz", "Gestión", "Sistema"],
  authors: [{ name: "EAGLES Team" }],
  creator: "EAGLES",
  publisher: "EAGLES",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/eagles-logo-new.png", type: "image/png" },
      { url: "/eagles-logo-new.png", sizes: "32x32", type: "image/png" },
      { url: "/eagles-logo-new.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/eagles-logo-new.png",
    apple: [
      { url: "/eagles-logo-new.png", type: "image/png" },
    ],
  },
  other: {
    "google": "notranslate",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" translate="no" className="notranslate dark" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#00D9FF" />
        <meta name="color-scheme" content="dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined' && window.location.pathname === '/') {
                  // Ajustar HTML inmediatamente
                  document.documentElement.classList.remove('dark');
                  document.documentElement.style.colorScheme = 'light';
                  document.documentElement.setAttribute('data-theme', 'light');
                  
                  // Función para ajustar body y wrappers
                  function adjustLandingPage() {
                    if (document.body) {
                      document.body.setAttribute('data-landing', 'true');
                      document.body.style.backgroundColor = 'white';
                      document.body.style.color = '#111827';
                      
                      // Ajustar wrappers cuando se rendericen
                      const adjustWrappers = () => {
                        const wrappers = document.querySelectorAll('div.bg-bg-primary, div.text-text-primary');
                        wrappers.forEach(wrapper => {
                          wrapper.classList.remove('bg-bg-primary', 'text-text-primary');
                          wrapper.style.backgroundColor = 'white';
                          wrapper.style.color = '#111827';
                        });
                      };
                      
                      // Ajustar inmediatamente si ya están renderizados
                      adjustWrappers();
                      
                      // Usar MutationObserver para ajustar cuando se agreguen elementos
                      const observer = new MutationObserver(adjustWrappers);
                      observer.observe(document.body, { childList: true, subtree: true });
                      
                      // Limpiar observer después de 3 segundos (suficiente para el render inicial)
                      setTimeout(() => observer.disconnect(), 3000);
                    }
                  }
                  
                  // Ejecutar cuando el DOM esté listo
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', adjustLandingPage);
                  } else {
                    adjustLandingPage();
                  }
                  
                  // También ejecutar en el próximo frame para asegurar
                  requestAnimationFrame(adjustLandingPage);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <LandingPageThemeFix />
        <Providers>
          <div className="min-h-screen bg-bg-primary text-text-primary">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
