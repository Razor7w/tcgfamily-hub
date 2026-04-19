import { Resend } from 'resend'

function getAppOrigin(): string {
  const auth = process.env.AUTH_URL?.trim()
  if (auth) return auth.replace(/\/$/, '')
  const pub = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (pub) return pub.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const u = new URL(origin)
    const h = u.hostname.toLowerCase()
    return h === 'localhost' || h === '127.0.0.1' || h === '::1'
  } catch {
    return false
  }
}

/**
 * No envía por Resend en desarrollo típico (yarn dev) ni cuando la URL canónica es localhost,
 * salvo que RESEND_SEND_IN_DEV=1 o true.
 */
function shouldSkipResendForLocalEnvironment(): boolean {
  const force =
    process.env.RESEND_SEND_IN_DEV === '1' ||
    process.env.RESEND_SEND_IN_DEV === 'true'
  if (force) return false
  if (process.env.NODE_ENV === 'development') return true
  return isLocalhostOrigin(getAppOrigin())
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Remitente por defecto para avisos de retiro (dominio verificado en Resend). */
const DEFAULT_PICKUP_FROM = 'TCG Family <notificaciones@hub.tcgfamily.cl>'

function formatResendFromHeader(raw: string): string {
  const t = raw.trim()
  if (!t) return DEFAULT_PICKUP_FROM
  if (t.includes('<') && t.includes('>')) return t
  return `TCG Family <${t}>`
}

/**
 * Orden: RESEND_FROM_MAIL_PICKUP (solo este tipo de correo) → RESEND_FROM (fallback general) → predeterminado.
 */
function buildPickupReadyFromHeader(): string {
  const specific = process.env.RESEND_FROM_MAIL_PICKUP?.trim()
  if (specific) return formatResendFromHeader(specific)
  const general = process.env.RESEND_FROM?.trim()
  if (general) return formatResendFromHeader(general)
  return DEFAULT_PICKUP_FROM
}

/**
 * Notifica al receptor que el envío físico ya fue recepcionado en tienda y puede retirarlo.
 * Sin RESEND_API_KEY solo registra un warning y no lanza (el flujo de negocio en BD ya quedó guardado).
 */
export async function sendMailPickupReadyEmail(input: {
  to: string
  recipientName?: string | null
  mailCode: string
}): Promise<{ sent: boolean; skippedReason?: string }> {
  if (shouldSkipResendForLocalEnvironment()) {
    console.info(
      '[email] Entorno local: no se envía correo por Resend. Define RESEND_SEND_IN_DEV=true para probar envíos reales.'
    )
    return { sent: false, skippedReason: 'local_dev' }
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.warn(
      '[email] RESEND_API_KEY no configurada: omitiendo aviso de retiro en tienda.'
    )
    return { sent: false, skippedReason: 'no_api_key' }
  }

  const to = input.to.trim()
  if (!to) {
    return { sent: false, skippedReason: 'empty_email' }
  }

  const origin = getAppOrigin()
  const dashboardMailUrl = `${origin}/dashboard/mail`
  const code = input.mailCode.trim()
  const greeting = input.recipientName?.trim()
    ? `Hola ${input.recipientName.trim()},`
    : 'Hola,'

  const subject = 'Tu correo ya está en tienda — puedes retirarlo'
  const text = `${greeting}

La tienda recepcionó tu envío. Ya puedes pasar a retirarlo con el código: ${code}

Más detalle en tu panel:
${dashboardMailUrl}

— TCG Family`

  const safeGreeting = escapeHtml(
    input.recipientName?.trim()
      ? `Hola ${input.recipientName.trim()},`
      : 'Hola,'
  )
  const safeCode = escapeHtml(code)

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /></head>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#18181b;background:#f4f4f5;padding:24px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:24px;">
    <tr><td>
      <p style="margin:0 0 16px;font-size:16px;">${safeGreeting}</p>
      <p style="margin:0 0 16px;font-size:15px;">La tienda <strong>recepcionó tu envío</strong>. Ya puedes pasar a retirarlo.</p>
      <p style="margin:0 0 8px;font-size:13px;color:#52525b;text-transform:uppercase;letter-spacing:0.06em;">Código</p>
      <p style="margin:0 0 24px;font-size:20px;font-weight:700;letter-spacing:0.02em;">${safeCode}</p>
      <a href="${escapeHtml(dashboardMailUrl)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px;font-size:15px;">Ver en mi panel</a>
      <p style="margin:24px 0 0;font-size:13px;color:#71717a;">Si no solicitaste este aviso, puedes ignorar este mensaje.</p>
    </td></tr>
  </table>
</body>
</html>`

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: buildPickupReadyFromHeader(),
    to: [to],
    subject,
    text,
    html
  })

  if (error) {
    console.error('[email] Resend error:', error)
    const msg =
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : 'Error al enviar email'
    throw new Error(msg)
  }

  return { sent: true }
}
