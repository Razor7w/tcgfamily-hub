/** Valor por defecto si aún no hay configuración en base de datos. */
export const MAIL_REGISTER_DAILY_LIMIT = 10

/** Tope al guardar el límite desde /admin/configuracion. */
export const MAIL_REGISTER_DAILY_LIMIT_ADMIN_MAX = 200

/** Cupo diario (día Chile) para registro de correo como invitado, por RUT emisor y tienda. */
export const GUEST_MAIL_REGISTER_DAILY_LIMIT = 10

/**
 * Tope por sesión de navegador (cookie de sesión) para invitados,
 * independiente del RUT: evita abusar cambiando RUTs en la misma pestaña/navegador.
 */
export const GUEST_MAIL_SESSION_LIMIT = 10
