import type { DefaultSession } from 'next-auth'
import type { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'user' | 'admin'
      rut: string
      popid: string
      hasPassword: boolean
    } & DefaultSession['user']
  }

  interface User {
    role: 'user' | 'admin'
    rut?: string
    popid?: string
    hasPassword?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role?: 'user' | 'admin'
    rut?: string
    popid?: string
    hasPassword?: boolean
  }
}
