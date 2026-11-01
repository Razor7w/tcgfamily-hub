import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function AdminMasLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (session?.user?.storeRole !== 'owner') {
    redirect('/admin')
  }
  return children
}
