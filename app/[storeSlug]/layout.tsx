import type { Metadata } from 'next'
import DashboardRouteLayout from '@/components/layouts/DashboardRouteLayout'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import { buildPageMetadata, SITE_NAME } from '@/lib/site-metadata'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ storeSlug: string }>
}

export async function generateMetadata({
  params
}: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { storeSlug } = await params
  const slug = storeSlug?.trim().toLowerCase() ?? ''

  if (!slug) {
    return buildPageMetadata({
      title: 'Tienda',
      description: `Hub de tienda en ${SITE_NAME}.`,
      path: '/'
    })
  }

  try {
    await connectDB()
    const store = await Store.findOne({ slug, isActive: true })
      .select('name logoUrl')
      .lean<{ name: string; logoUrl?: string } | null>()

    if (store?.name) {
      const description = `Eventos de la semana, correo en tienda y puntos de ${store.name} en ${SITE_NAME}.`
      return buildPageMetadata({
        title: store.name,
        description,
        path: `/${slug}`,
        image: store.logoUrl?.trim() || undefined
      })
    }
  } catch {
    /* fallback si la BD no está disponible en build/prerender */
  }

  return buildPageMetadata({
    title: slug,
    description: `Hub de tienda en ${SITE_NAME}.`,
    path: `/${slug}`
  })
}

export default function StoreHubLayout({ children }: LayoutProps) {
  return <DashboardRouteLayout>{children}</DashboardRouteLayout>
}
