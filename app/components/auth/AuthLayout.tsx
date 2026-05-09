import { auth } from '@/auth'
import { redirect } from 'next/navigation'

interface AuthLayoutProps {
  children: React.ReactNode
  role?: 'user' | 'admin'
}

/**
 * Layout que protege rutas requiriendo autenticación
 * Si el usuario no está autenticado, redirige a la página principal (/)
 */
export default async function AuthLayout({
  children,
  role = 'user'
}: AuthLayoutProps) {
  const session = await auth()

  const staffOk =
    session?.user.storeRole === 'owner' ||
    session?.user.storeRole === 'store_admin'
  // Panel staff: debe tener membresía/rol de tienda o seguir usando rol legacy sólo donde la sesión hidrate storeRole.

  if (session && role === 'admin' && !staffOk) {
    redirect('/')
  }

  // Si no hay sesión, redirigir a la página principal
  if (!session) {
    redirect('/')
  }

  return <>{children}</>
}
