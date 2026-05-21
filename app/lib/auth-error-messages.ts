/** Códigos de error de Auth.js / NextAuth (query `?error=`). */
export type AuthErrorCode =
  | 'Configuration'
  | 'AccessDenied'
  | 'Verification'
  | 'OAuthSignin'
  | 'OAuthCallback'
  | 'OAuthCreateAccount'
  | 'EmailCreateAccount'
  | 'Callback'
  | 'OAuthAccountNotLinked'
  | 'EmailSignin'
  | 'CredentialsSignin'
  | 'SessionRequired'
  | 'Default'

export type AuthErrorContent = {
  title: string
  message: string
  /** Consejo opcional (p. ej. navegador in-app). */
  hint?: string
}

const MESSAGES: Record<AuthErrorCode, AuthErrorContent> = {
  Configuration: {
    title: 'Configuración del servidor',
    message:
      'El inicio de sesión no está bien configurado en el servidor. Si el problema continúa, avisa al equipo de TCG Nexo.'
  },
  AccessDenied: {
    title: 'Acceso denegado',
    message: 'No tienes permiso para iniciar sesión con esta cuenta.'
  },
  Verification: {
    title: 'Enlace caducado',
    message:
      'El enlace de verificación expiró o ya se usó. Vuelve a intentar iniciar sesión.'
  },
  OAuthSignin: {
    title: 'No se pudo conectar con Google',
    message:
      'Hubo un problema al abrir la ventana de Google. Comprueba tu conexión e inténtalo de nuevo.'
  },
  OAuthCallback: {
    title: 'No se completó el inicio con Google',
    message:
      'Google devolvió la sesión pero algo falló al procesarla (cookies, dominio o navegador).',
    hint: 'Si entraste desde WhatsApp, Instagram u otra app, abre tcgnexo.cl en Safari o Chrome y vuelve a iniciar sesión. Si guardaste el enlace antiguo hub.tcgfamily.cl, usa tcgnexo.cl.'
  },
  OAuthCreateAccount: {
    title: 'No se pudo crear la cuenta',
    message:
      'Google respondió correctamente, pero no pudimos guardar tu usuario. Inténtalo de nuevo en unos minutos.'
  },
  EmailCreateAccount: {
    title: 'No se pudo crear la cuenta',
    message: 'No pudimos crear la cuenta con este correo.'
  },
  Callback: {
    title: 'Error al iniciar sesión',
    message:
      'Ocurrió un error al preparar tu sesión. Inténtalo de nuevo; si persiste, prueba en otro navegador.'
  },
  OAuthAccountNotLinked: {
    title: 'Cuenta ya registrada',
    message:
      'Este correo ya está asociado a otro método de acceso. Inicia sesión con el correo y contraseña que usaste al registrarte, o contacta soporte.'
  },
  EmailSignin: {
    title: 'Correo no enviado',
    message: 'No pudimos enviar el enlace de acceso por correo.'
  },
  CredentialsSignin: {
    title: 'Credenciales incorrectas',
    message: 'Correo o contraseña incorrectos.'
  },
  SessionRequired: {
    title: 'Sesión requerida',
    message: 'Debes iniciar sesión para ver esta página.'
  },
  Default: {
    title: 'No se pudo iniciar sesión',
    message:
      'Ocurrió un error inesperado. Inténtalo de nuevo o usa otro navegador.'
  }
}

function isAuthErrorCode(value: string): value is AuthErrorCode {
  return value in MESSAGES
}

export function getAuthErrorContent(
  code: string | null | undefined
): AuthErrorContent & { code: string } {
  const normalized = (code ?? '').trim()
  if (normalized && isAuthErrorCode(normalized)) {
    return { code: normalized, ...MESSAGES[normalized] }
  }
  return { code: normalized || 'Default', ...MESSAGES.Default }
}
