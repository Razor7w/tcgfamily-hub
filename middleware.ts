import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { defaultPublicStoreSlugForHost } from '@/lib/multitenancy/host-policy'

/**
 * Inyecta el slug de tienda por defecto para lecturas mediante
 * `publicStoreSlugFromHeaders`. Un solo dominio: siempre slug primary (o env).
 */
export function middleware(request: NextRequest) {
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
