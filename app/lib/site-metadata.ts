import type { Metadata } from 'next'
import { BRAND_OG_IMAGE_SRC } from '@/lib/brand-assets'

export const SITE_NAME = 'TCG Nexo'

const defaultOgImage = {
  url: BRAND_OG_IMAGE_SRC,
  width: 1200,
  height: 630,
  alt: SITE_NAME
}

export const SITE_DESCRIPTION =
  'Plataforma para tiendas TCG: eventos semanales, correo físico, puntos de tienda, mazos y torneos Pokémon en un solo lugar.'

/** URL canónica (Open Graph, enlaces absolutos). */
export function getSiteUrl(): string {
  const pub = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (pub) return pub.replace(/\/$/, '')
  const auth = process.env.AUTH_URL?.trim()
  if (auth) return auth.replace(/\/$/, '')
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  }
  return 'http://localhost:3000'
}

export function siteMetadataBase(): URL {
  return new URL(getSiteUrl())
}

function absoluteUrl(path: string): string {
  const base = getSiteUrl()
  if (!path || path === '/') return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

type BuildPageMetadataOptions = {
  /** Título corto de la página (el layout raíz añade «| TCG Nexo»). */
  title?: string
  description?: string
  /** Ruta relativa, p. ej. `/dashboard` o `/tcgfamily`. */
  path?: string
  /** Paneles privados: no indexar en buscadores. */
  noIndex?: boolean
  /** URL absoluta o relativa de imagen para vista previa al compartir. */
  image?: string
}

/** Metadatos por ruta (título, descripción, Open Graph, Twitter). */
export function buildPageMetadata(
  options: BuildPageMetadataOptions = {}
): Metadata {
  const description = options.description ?? SITE_DESCRIPTION
  const pageTitle = options.title
    ? `${options.title} | ${SITE_NAME}`
    : SITE_NAME
  const url = options.path ? absoluteUrl(options.path) : getSiteUrl()
  const images = options.image
    ? [
        {
          url: options.image.startsWith('http')
            ? options.image
            : absoluteUrl(options.image)
        }
      ]
    : [{ ...defaultOgImage, url: absoluteUrl(BRAND_OG_IMAGE_SRC) }]

  return {
    ...(options.title ? { title: options.title } : { title: SITE_NAME }),
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'es_CL',
      siteName: SITE_NAME,
      title: pageTitle,
      description,
      url,
      ...(images ? { images } : {})
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      ...(images ? { images: images.map(i => i.url) } : {})
    },
    ...(options.noIndex
      ? { robots: { index: false, follow: false } }
      : { robots: { index: true, follow: true } })
  }
}

/**
 * Sin `metadataBase` fijo: si el usuario entra por hub.tcgfamily.cl, Next no debe
 * pedir RSC a tcgnexo.cl (OPTIONS cross-origin → 400). Las URLs absolutas de OG
 * siguen usando `getSiteUrl()` / `absoluteUrl()`.
 */
export const rootSiteMetadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: getSiteUrl(),
    images: [defaultOgImage]
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [absoluteUrl(BRAND_OG_IMAGE_SRC)]
  },
  robots: { index: true, follow: true }
}
