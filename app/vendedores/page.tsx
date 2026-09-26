import type { Metadata } from 'next'
import PublicVendedoresClient from './PublicVendedoresClient'

export const metadata: Metadata = {
  title: 'Vendedores',
  description:
    'Listado de jugadores con carpetas de singles publicadas en TCG Nexo.'
}

export default function PublicVendedoresPage() {
  return <PublicVendedoresClient />
}
