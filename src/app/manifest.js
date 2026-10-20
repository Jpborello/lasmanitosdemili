export default function manifest() {
  return {
    name: 'Las Manitos de Mili | Manicuría Rosario',
    short_name: 'Las Manitos',
    description: 'Estudio de manicuría, belleza de uñas y pedicuría en Rosario. Reserva tu turno online.',
    start_url: '/',
    id: '/',
    display: 'standalone',
    background_color: '#fdfaf6',
    theme_color: '#fdfaf6',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'es',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Reservar Turno',
        short_name: 'Reservar',
        description: 'Reservar turno online en el estudio de Rosario',
        url: '/#turnos',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Mis Turnos',
        short_name: 'Mis Turnos',
        description: 'Consultar estado de mis turnos reservados',
        url: '/mis-turnos',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
