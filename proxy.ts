import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { defaultPublicStoreSlugForHost } from '@/lib/multitenancy/host-policy'

const LEGACY_HOST = 'hub.tcgfamily.cl'
const CANONICAL_ORIGIN = 'https://tcgnexo.cl'

/**
 * Inyecta el slug de tienda por defecto para lecturas mediante
 * `publicStoreSlugFromHeaders`. Un solo dominio: siempre slug primary (o env).
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase()
  if (host === LEGACY_HOST) {
    const dest = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      CANONICAL_ORIGIN
    )
    return NextResponse.redirect(dest, 301)
  }

  const slug = defaultPublicStoreSlugForHost()

  const reqHeaders = new Headers(request.headers)
  reqHeaders.set('x-default-store-slug', slug)

  return NextResponse.next({
    request: { headers: reqHeaders }
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
