import packageJson from '../../package.json'

/** Versión de la app (desde `package.json`, fijada en tiempo de compilación). */
export const APP_VERSION = packageJson.version as string
