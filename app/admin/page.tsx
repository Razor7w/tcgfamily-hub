import { redirect } from 'next/navigation'

/** La vista tipo panel fue retirada; el admin entra directo a usuarios. */
export default function AdminIndexPage() {
  redirect('/admin/users')
}
