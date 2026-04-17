# Cómo publicar una nueva versión

Guía práctica para subir de versión el **TCGFamily HUB** de forma ordenada. La versión que ven los usuarios en la web coincide con el campo `"version"` de `package.json` (se inyecta al **compilar**; tras un deploy nuevo, el pie de página y la barra lateral muestran ese número).

## Antes de empezar

- Ten claro si el cambio es **patch** (arreglos), **minor** (funcionalidad nueva compatible) o un salto mayor; ver [`VERSIONING.md`](../VERSIONING.md).
- La fuente de verdad del número es **`package.json`**; el componente [`AppVersion`](../app/components/AppVersion.tsx) lee [`app/lib/app-version.ts`](../app/lib/app-version.ts).

## Checklist de release

1. **Integrar el trabajo** en la rama principal (PR mergeado, CI en verde).

2. **Actualizar `CHANGELOG.md`**
   - Si había entradas bajo `[Unreleased]`, muévelas a una sección nueva `## [X.Y.Z] - AAAA-MM-DD`.
   - Si no usabas `[Unreleased]`, añade la sección `[X.Y.Z]` con los puntos bajo *Añadido / Cambiado / Corregido*.

3. **Subir la versión en `package.json`**
   - Edita `"version": "X.Y.Z"` para que sea **la misma** que en el changelog.

4. **Probar localmente (recomendado)**
   - `yarn build` (o `npm run build`).
   - Comprueba en la UI que el pie muestre **Versión X.Y.Z** (login `/`, registro `/auth/register`, barra lateral en `/dashboard` y `/admin`).

5. **Commit**
   - Mensaje sugerido: `chore: release X.Y.Z` o `release: X.Y.Z`.

6. **Tag en git (opcional pero útil)**
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
   Así puedes enlazar comparativas en GitHub y en el pie del [`CHANGELOG.md`](../CHANGELOG.md).

7. **Desplegar**
   - Tras el deploy (p. ej. Vercel), la versión visible en producción será la del **último build** con ese `package.json`. Un usuario con pestaña abierta de hace días seguirá viendo el JS viejo hasta recargar.

## Si solo quieres documentar cambios aún no publicados

- Deja los cambios en **`[Unreleased]`** del changelog.
- **No** subas `version` en `package.json` hasta el día del release (o sube solo cuando vayas a etiquetar).

## Dónde se muestra la versión en la app

| Ubicación | Archivo / componente |
|-----------|----------------------|
| Pie de login | [`app/page.tsx`](../app/page.tsx) |
| Pie de registro | [`app/auth/register/page.tsx`](../app/auth/register/page.tsx) |
| Debajo del menú lateral (dashboard y admin) | [`DashboardUserNav`](../app/components/navigation/DashboardUserNav.tsx) → [`AppVersion`](../app/components/AppVersion.tsx) |

Para añadir otro sitio, importa `AppVersion` y pásale `align="left"` o `align="center"` según el diseño.
