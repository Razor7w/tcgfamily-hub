import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import {
  defaultPublicStoreSlugForHost,
  hostNeedsStoreChoiceBeforeProtectedRoutes,
  normalizedHostname
} from '@/lib/multitenancy/host-policy'
import { STORE_SLUG_INGRESS_SENTINEL } from '@/lib/multitenancy/ingress-headers'

const AUTH_SECRET = process.env.AUTH_SECRET

export async function middleware(request: NextRequest) {
  const host = normalizedHostname(request.headers.get('host'))
  const slug = defaultPublicStoreSlugForHost(host)

  const reqHeaders = new Headers(request.headers)
  reqHeaders.set('x-default-store-slug', slug ?? STORE_SLUG_INGRESS_SENTINEL)

  const res = NextResponse.next({
    request: { headers: reqHeaders }
  })

  const pathname = request.nextUrl.pathname

  const isPotentialStoreGate =
    pathname.startsWith('/dashboard') || pathname.startsWith('/admin')

  if (
    !AUTH_SECRET ||
    !isPotentialStoreGate ||
    pathname.startsWith('/api/auth')
  ) {
    return res
  }

  if (!hostNeedsStoreChoiceBeforeProtectedRoutes(host)) {
    return res
  }

  try {
    const token = await getToken({
      req: request,
      secret: AUTH_SECRET as string,
      secureCookie: process.env.NODE_ENV === 'production'
    })

    const needsExplicit =
      token &&
      !(token.activeStoreId && String(token.activeStoreId).trim()) &&
      pathname !== '/select-store'

    if (needsExplicit) {
      const url = request.nextUrl.clone()
      url.pathname = '/select-store'
      url.searchParams.set('next', pathname + request.nextUrl.search)
      return NextResponse.redirect(url)
    }
  } catch {
    /* dejar pasar si el token no se puede leer */
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
