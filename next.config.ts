import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard/mi-cuenta',
        destination: '/dashboard/tu-actividad',
        permanent: true
      },
      {
        source: '/dashboard/mi-cuenta/partidas',
        destination: '/dashboard/tu-actividad/partidas',
        permanent: true
      }
    ]
  }
}

export default nextConfig
