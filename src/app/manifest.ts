import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Confia Drive ERP - Taller Automotriz',
    short_name: 'Confia Drive ERP',
    description: 'Sistema de gestión integral para talleres automotrices',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#00D9FF',
    orientation: 'portrait',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: 'https://i.ibb.co/s84KMYf/Whats-App-Image-2026-04-14-at-5-45-32-PM.jpg',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'https://i.ibb.co/s84KMYf/Whats-App-Image-2026-04-14-at-5-45-32-PM.jpg',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'https://i.ibb.co/s84KMYf/Whats-App-Image-2026-04-14-at-5-45-32-PM.jpg',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'https://i.ibb.co/s84KMYf/Whats-App-Image-2026-04-14-at-5-45-32-PM.jpg',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}

