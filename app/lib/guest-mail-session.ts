import type { NextRequest, NextResponse } from 'next/server'
import { GUEST_MAIL_SESSION_LIMIT } from '@/lib/mail-register-constants'

/** Cookie de sesión (sin Max-Age): se borra al cerrar el navegador. */
export const GUEST_MAIL_SESSION_COOKIE = 'guest_mail_sess'

export function readGuestMailSessionUsed(request: NextRequest): number {
  const raw = request.cookies.get(GUEST_MAIL_SESSION_COOKIE)?.value
  const n = Number.parseInt(raw ?? '0', 10)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(Math.floor(n), GUEST_MAIL_SESSION_LIMIT + 50)
}

export function guestMailSessionSnapshot(request: NextRequest) {
  const sessionUsed = readGuestMailSessionUsed(request)
  return {
    sessionUsed,
    sessionLimit: GUEST_MAIL_SESSION_LIMIT,
    sessionRemaining: Math.max(0, GUEST_MAIL_SESSION_LIMIT - sessionUsed)
  }
}

function setGuestMailSessionCookie(response: NextResponse, used: number) {
  response.cookies.set(GUEST_MAIL_SESSION_COOKIE, String(used), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production'
  })
}

/** Calcula el siguiente contador, lo escribe en la cookie de la respuesta y lo devuelve. */
export function bumpGuestMailSessionCookie(
  request: NextRequest,
  response: NextResponse
): { sessionUsed: number; sessionRemaining: number; sessionLimit: number } {
  const sessionUsed = Math.min(
    readGuestMailSessionUsed(request) + 1,
    GUEST_MAIL_SESSION_LIMIT
  )
  setGuestMailSessionCookie(response, sessionUsed)
  return {
    sessionUsed,
    sessionLimit: GUEST_MAIL_SESSION_LIMIT,
    sessionRemaining: Math.max(0, GUEST_MAIL_SESSION_LIMIT - sessionUsed)
  }
}
