import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Casa Pacifica',
    short_name: 'Casa Pacifica',
    description: 'Explore Casa Pacifica and plan your direct booking. Booking requires an internet connection.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F6F3EB',
    theme_color: '#344D3C',
    lang: 'en',
    icons: [
      { src: '/icons/casa-pacifica-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/casa-pacifica-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/casa-pacifica-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
