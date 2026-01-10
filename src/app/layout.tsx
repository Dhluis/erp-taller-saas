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
                // Ejecutar inmediatamente sin esperar nada
                const pathname = window.location?.pathname || '/';
                if (pathname === '/') {
                  // Ajustar HTML ANTES de cualquier otra cosa
                  const html = document.documentElement;
                  html.classList.remove('dark');
                  html.style.setProperty('color-scheme', 'light', 'important');
                  html.setAttribute('data-theme', 'light');
                  
                  // Función para ajustar body y wrappers - ejecutar múltiples veces
                  function adjustLandingPage() {
                    const body = document.body;
                    if (body) {
                      body.setAttribute('data-landing', 'true');
                      body.style.setProperty('background-color', 'white', 'important');
                      body.style.setProperty('color', '#111827', 'important');
                      
                      // Ajustar wrappers inmediatamente
                      const adjustWrappers = () => {
                        // Buscar TODOS los divs con clases oscuras
                        const wrappers = document.querySelectorAll('div.bg-bg-primary, div.text-text-primary, div.min-h-screen');
                        wrappers.forEach(wrapper => {
                          const el = wrapper;
                          el.classList.remove('bg-bg-primary', 'text-text-primary');
                          el.style.setProperty('background-color', 'white', 'important');
                          el.style.setProperty('background', 'white', 'important');
                          el.style.setProperty('color', '#111827', 'important');
                        });
                        
                        // Buscar también por selector más genérico
                        const allDivs = document.querySelectorAll('body > div > div');
                        allDivs.forEach(div => {
                          const el = div;
                          if (el.classList.contains('bg-bg-primary') || el.classList.contains('text-text-primary')) {
                            el.style.setProperty('background-color', 'white', 'important');
                            el.style.setProperty('color', '#111827', 'important');
                          }
                        });
                      };
                      
                      // Ejecutar inmediatamente
                      adjustWrappers();
                      
                      // Ejecutar múltiples veces para asegurar
                      setTimeout(adjustWrappers, 0);
                      setTimeout(adjustWrappers, 10);
                      setTimeout(adjustWrappers, 50);
                      setTimeout(adjustWrappers, 100);
                      setTimeout(adjustWrappers, 200);
                      setTimeout(adjustWrappers, 500);
                      
                      // Usar MutationObserver para ajustar cuando se agreguen elementos
                      const observer = new MutationObserver(function(mutations) {
                        adjustWrappers();
                      });
                      observer.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
                      
                      // Mantener observer activo por más tiempo
                      setTimeout(() => observer.disconnect(), 5000);
                    }
                  }
                  
                  // Ejecutar INMEDIATAMENTE si body existe
                  if (document.body) {
                    adjustLandingPage();
                  } else {
                    // Si body no existe, esperar a que se cree
                    const bodyObserver = new MutationObserver(function(mutations, obs) {
                      if (document.body) {
                        adjustLandingPage();
                        obs.disconnect();
                      }
                    });
                    bodyObserver.observe(document.documentElement, { childList: true });
                  }
                  
                  // Ejecutar cuando el DOM esté listo (por si acaso)
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', adjustLandingPage, { once: true });
                  } else {
                    adjustLandingPage();
                  }
                  
                  // Ejecutar en múltiples frames para asegurar
                  requestAnimationFrame(adjustLandingPage);
                  requestAnimationFrame(() => requestAnimationFrame(adjustLandingPage));
                  requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(adjustLandingPage)));
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
