import { getDashboardDocForStore } from '@/lib/dashboard-settings-for-store'

/**
 * Si el owner desactivó los avisos en `/admin/configuracion` para esa tienda,
 * no se llama a Resend al marcar un envío como recepcionado en tienda.
 */
export async function getResendNotifyPickupInStoreEnabledForStore(
  storeMongoId: string
): Promise<boolean> {
  const doc = await getDashboardDocForStore(storeMongoId)
  return doc.resendNotifyPickupInStoreEnabled !== false
}
