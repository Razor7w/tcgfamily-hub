# Versionado

La **versión canónica** del proyecto es la de `package.json` (`version`). Debe coincidir con la última entrada numerada de `CHANGELOG.md` cuando se publique un hito (actualmente **0.6.3**).

## Versión en la interfaz

El texto **“Versión X.Y.Z”** en login, registro y barra lateral sale de `package.json` vía [`app/lib/app-version.ts`](./app/lib/app-version.ts) y el componente [`app/components/AppVersion.tsx`](./app/components/AppVersion.tsx). Es el valor **compilado en el build**; no es un fetch a API.

Para el proceso completo al subir versión (changelog, tag, deploy), ver [`docs/RELEASES.md`](./docs/RELEASES.md).

## SemVer (fase 0.x)

Mientras la versión mayor sea **0**, la API pública del paquete no está estabilizada. Aun así seguimos SemVer de forma práctica:

| Cambio                                                       | Bump                                                                  | Ejemplo                                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Correcciones internas, sin comportamiento nuevo relevante    | **PATCH** `0.3.0` → `0.3.1`                                           | Bugfix de UI o API interna                                                                         |
| Funcionalidad nueva compatible (nuevas rutas, flags, emails) | **MINOR** `0.2.1` → `0.3.0`                                           | Nuevo flujo, módulo opcional o conjunto de features (p. ej. torneos custom + módulo «Mis torneos») |
| Cambio que rompe integración o datos esperados               | **MINOR** en 0.x (o subir a **1.0.0** cuando el producto sea estable) | Migración de esquema obligatoria, eliminación de endpoint usado en producción                      |

Cuando el producto esté listo para compromisos de compatibilidad, se puede pasar a **1.0.0** y aplicar SemVer clásico en MAJOR/MINOR/PATCH.

## Flujo al cerrar un hito

1. Actualizar `CHANGELOG.md`: mover ítems de `[Unreleased]` a una sección `[X.Y.Z]` con fecha.
2. Igualar `package.json` → `"version": "X.Y.Z"` (y lockfile si aplica).
3. Commit con mensaje claro, p. ej. `chore: release 0.3.0`.
4. Opcional: tag git `vX.Y.Z` y release en GitHub; si el remoto no es el placeholder del changelog, sustituir las URLs al final de `CHANGELOG.md`.

## Qué no versiona este número

La versión de **Next.js**, **Node** o dependencias se fija en `package.json` / lockfile; no forma parte del número SemVer del producto salvo que documentéis política explícita (p. ej. “soportamos Node 22+”).
