import { redirect } from 'next/navigation'

type PageProps = {
  params: Promise<{ slug: string }>
}

/** Legacy: singles ya no van por tienda; redirige a carpetas de usuario. */
export default async function LegacyStoreSinglesRedirect({
  params
}: PageProps) {
  await params
  redirect('/dashboard/carpetas')
}
