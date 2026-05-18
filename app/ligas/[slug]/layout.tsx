import type { Metadata } from 'next'
import connectDB from '@/lib/mongodb'
import League from '@/models/League'
import { buildPageMetadata, SITE_NAME } from '@/lib/site-metadata'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params
}: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { slug } = await params
  const normalized = slug?.trim().toLowerCase() ?? ''

  if (!normalized) {
    return buildPageMetadata({
      title: 'Liga',
      path: '/ligas'
    })
  }

  try {
    await connectDB()
    const league = await League.findOne({ slug: normalized, isActive: true })
      .select('name')
      .lean<{ name: string } | null>()

    if (league?.name) {
      return buildPageMetadata({
        title: league.name,
        description: `Clasificación y puntos de la liga ${league.name} en ${SITE_NAME}.`,
        path: `/ligas/${normalized}`
      })
    }
  } catch {
    /* fallback */
  }

  return buildPageMetadata({
    title: normalized,
    description: `Clasificación de liga en ${SITE_NAME}.`,
    path: `/ligas/${normalized}`
  })
}

export default function LigaDetailLayout({ children }: LayoutProps) {
  return children
}
