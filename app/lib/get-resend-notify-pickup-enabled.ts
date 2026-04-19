import connectDB from '@/lib/mongodb'
import DashboardModuleSettings from '@/models/DashboardModuleSettings'

/**
 * Si el admin desactivó los avisos en `/admin/configuracion`, no se llama a Resend
 * al marcar un envío como recepcionado en tienda.
 */
export async function getResendNotifyPickupInStoreEnabled(): Promise<boolean> {
  await connectDB()
  const doc = await DashboardModuleSettings.findOne()
    .select('resendNotifyPickupInStoreEnabled')
    .lean()
  const d = doc as { resendNotifyPickupInStoreEnabled?: boolean } | null
  return d?.resendNotifyPickupInStoreEnabled !== false
}
