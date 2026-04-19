# Autenticación en rutas API

## Patrón admin

Las rutas bajo `app/api/admin/**` deben comprobar sesión y rol **admin** antes de tocar la base de datos o lógica sensible.

### Helper recomendado

[`app/lib/api-auth.ts`](../app/lib/api-auth.ts) exporta `requireAdminSession()`:

```ts
import { requireAdminSession } from '@/lib/api-auth'

export async function GET() {
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response
  const { session } = gate
  // …
}
```

- Respuesta unificada: **`401`** + `{ error: 'No autorizado' }` si no hay usuario o el rol no es `admin` (alineado con rutas existentes como [`app/api/admin/events/route.ts`](../app/api/admin/events/route.ts)).

### Rutas que deben seguir este patrón

- Prefijo **`/api/admin/*`**: eventos, ligas, importaciones, configuración, etc.
- **`/api/users/*`** y **`/api/mail/*`**: operaciones reservadas a admin según el handler (revisar cada método).

### Usuarios autenticados (no admin)

Rutas como `GET /api/me` o `GET /api/events/my-*` suelen usar `auth()` y comprobar `session?.user?.id` sin exigir `role === 'admin'`. Mantener la semántica **`401`** para no autenticado y mensajes claros en el cuerpo JSON.

## Registro y credenciales

- **`POST /api/auth/register`**: validación de datos + límite por IP (ver handler).
- **Credenciales (NextAuth)**: límites en [`app/auth.ts`](../app/auth.ts) (`createSlidingWindowLimiter`, bloqueo tras fallos).

## Healthcheck

[`GET /api/health`](../app/api/health/route.ts) expone estado de MongoDB; lleva **rate limit por IP** ligero para reducir abuso en despliegues públicos.
