import { after } from 'next/server'
import { sendMailPickupReadyEmail } from '@/lib/email/send-mail-pickup-ready'
import { getResendNotifyPickupInStoreEnabledForStore } from '@/lib/get-resend-notify-pickup-enabled'

export type MailPickupReadyEmailJob = {
  toEmail: string
  recipientName?: string
  mailCode: string
}

/** Envía avisos de retiro en tienda después de responder la API (estado ya persistido). */
export function queueMailPickupReadyEmails(
  storeId: string,
  jobs: MailPickupReadyEmailJob[]
): void {
  if (jobs.length === 0) return

  after(async () => {
    try {
      const notifyEnabled =
        await getResendNotifyPickupInStoreEnabledForStore(storeId)
      if (!notifyEnabled) {
        console.info(
          '[email] Aviso Resend desactivado en configuración (recepción en tienda).'
        )
        return
      }

      for (const job of jobs) {
        const to = job.toEmail.trim()
        const mailCode = job.mailCode.trim()
        if (!to || !mailCode) continue
        try {
          await sendMailPickupReadyEmail({
            to,
            recipientName: job.recipientName,
            mailCode
          })
        } catch (emailErr) {
          console.error(
            '[email] Aviso por email de retiro no enviado:',
            emailErr
          )
        }
      }
    } catch (err) {
      console.error('[email] Error al encolar avisos de retiro en tienda:', err)
    }
  })
}
