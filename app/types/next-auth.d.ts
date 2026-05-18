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
      /** Preferencia de tienda (ObjectId hex). `null` si aún no definida. */
      defaultStoreId?: string | null
      /** Tienda activa (Mongo ObjectId como string). */
      activeStoreId?: string | null
      /** Rol de staff en la tienda activa (`null` si no aplica). */
      storeRole?: 'owner' | 'store_admin' | null
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
    activeStoreId?: string
    storeRole?: 'owner' | 'store_admin'
    /** Preferencia de tienda (ObjectId hex). Cadena vacía = sin preferencia en JWT. */
    defaultStoreId?: string
  }
}
