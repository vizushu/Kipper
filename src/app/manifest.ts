import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Kipper Stays',
    short_name: 'Kipper',
    description: 'Explore Kipper stays and plan your direct booking. Booking requires an internet connection.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FAF8F5',
    theme_color: '#1C1917',
    lang: 'en',
    icons: [
      { src: '/icons/kipper-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/kipper-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/kipper-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
