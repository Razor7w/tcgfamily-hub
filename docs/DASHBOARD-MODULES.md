# Panel del jugador (`/dashboard` y rutas relacionadas): módulos, multi‑tienda y guías

Describe la separación **tienda (`store`) vs jugador (`player`)**, las **dos pantallas** (Inicio y Mi cuenta), dónde se guarda la configuración y cómo **añadir un módulo** sin romper permisos ni el modelo multitenant.

## Contexto multi‑tenant

- El jugador eligió una **tienda activa** (JWT `activeStoreId`, selector en `Header.tsx`).
- El layout de `/dashboard` carga configuración desde Mongo **por esa tienda**: `loadDashboardModuleSettings(activeStoreMongoId)` en `app/dashboard/layout.tsx`.
- El resultado se inyecta con `DashboardModulesProvider` (`app/contexts/DashboardModulesContext.tsx`) para que **`DashboardHomeContent` no haga fetch** de esa config en cliente.

Las reglas visibles/ocultos y el orden aplican **a todos los usuarios que naveguen con esa tienda como contexto**. No son preferencias personales persistidas por usuario.

## Alcances (`DashboardModuleScope`)

| Alcance   | Rol en producto                                                                 | Ejemplos actuales                                      |
|-----------|-----------------------------------------------------------------------------------|--------------------------------------------------------|
| `store`   | Contenido y flujos anclados a la tienda seleccionada (eventos locales, físico…)   | `weeklyEvents`, `mail`, `storePoints`                 |
| `player`  | Actividad centrada en el perfil del usuario en el hub                            | `recentPublicDecklists`, `myTournaments`, `statistics` |

Los metadatos viven solo en código:

- `DASHBOARD_MODULE_SCOPE` en `app/lib/dashboard-module-config.ts`
- Textos editoriales opcionales: `DASHBOARD_SECTION_COPY` (p. ej. descripción debajo del título en **Mi cuenta**).

## Rutas: Inicio vs Mi cuenta

| Ruta                       | Pantalla   | Qué muestra |
|----------------------------|------------|--------------|
| `/dashboard`               | **Inicio** | Solo módulos **store** (`variant="inicio"`) más **accesos rápidos** (shortcuts). |
| `/dashboard/mi-cuenta`    | **Mi cuenta** | Solo módulos **player** (`variant="mi-cuenta"`); sin shortcuts. `/dashboard/perfil` sigue siendo **ajustes de cuenta** (contraseña, avatar, datos). |

El sidebar lista **Inicio** y **Mi cuenta** con estado `selected`; la misma configuración por tienda gobierna ambas pantallas mediante `visibility` y `order` (canónico: tienda antes que jugador en el vector persistido).

## Persistencia (`DashboardModuleSettings`)

Modelo Mongoose: `app/models/DashboardModuleSettings.ts`

- Una fila lógica **por tienda** (`storeId`), con rutas legacy documentadas en `dashboard-settings-for-store.ts`.
- Campos relevantes para el dashboard:
  - `visibility`: un booleano por `DashboardModuleId`.
  - `order`: una **permutación completa** de todos los IDs (sin duplicados).
  - `shortcuts`: atajos de la franja superior (registrar correo, torneo custom, PDF decklist).

**Accesos rápidos**: solo en **Inicio**; acciones en contexto de tienda (`DashboardHomeContent` con `variant="inicio"`).

## Representación del orden guardado vs UI

Para simplificar multitenant:

1. **`mergeDashboardSettings` canonicaliza siempre `order`** con `canonicalizeDashboardOrder`: formato **primero todos los módulos `store`, en el orden definido dentro de ese grupo; luego todos los `player`**, en su orden dentro del grupo (`splitDashboardOrder` + `mergeScopedDashboardOrders`).
2. En **`/admin/configuracion`** el editor muestra **dos listas de reordenamiento** (órden de Inicio vs de Mi cuenta) y al guardar se persiste **`[...storeOrder, ...playerOrder]`**.
3. **`DashboardHomeContent`** filtra por `variant`: **`inicio`** renderiza sólo alcance store + shortcuts; **`mi-cuenta`** sólo alcance player.

Los jugadores así separan navegación “lo de esta tienda” vs “mis torneos / mazos / stats”.

## Archivos principales

| Archivo                                                                 | Responsabilidad                                                                 |
|-------------------------------------------------------------------------|----------------------------------------------------------------------------------|
| `app/lib/dashboard-module-config.ts`                                    | IDs, defaults, alcance, orden canónico, `mergeDashboardSettings`                 |
| `app/models/DashboardModuleSettings.ts`                                  | Schema Mongo                                                                     |
| `app/lib/dashboard-settings-for-store.ts`                               | Hydratar documento por `storeId` (admin/API)                                       |
| `app/lib/load-dashboard-module-settings.ts`                             | Lectura servidor para layouts                                                    |
| `app/dashboard/layout.tsx`                                              | Carga por `activeStoreId` + provider                                             |
| `app/components/dashboard/DashboardHomeContent.tsx`                     | Mapa de bloques; `variant` `inicio` \| `mi-cuenta`; shortcuts sólo `inicio`      |
| `app/dashboard/page.tsx` / `app/dashboard/mi-cuenta/page.tsx`           | Títulos y envoltorio de cada pantalla                                             |
| `app/components/navigation/DashboardUserNav.tsx`                         | Enlaces Inicio / Mi cuenta (y resto del menú)                                     |
| `app/admin/configuracion/page.tsx`                                      | UI owner: visibilidad y orden por alcance                                         |
| `app/api/admin/configuracion/route.ts`                                  | GET/PUT (solo owner)                                                             |

---

## Guía: añadir un módulo de **tienda** (`scope: store`)

Ideal si el nuevo bloque depende de **`activeStoreId`**, políticas locales o datos que la tienda “posee” para el jugador que eligió ese contexto.

### Checklist (orden recomendado)

1. **`app/lib/dashboard-module-config.ts`**
   - Añade el nuevo id al literal `DASHBOARD_MODULE_IDS`.
   - Añada la clave correspondiente en:
     - `DEFAULT_DASHBOARD_VISIBILITY`
     - `DASHBOARD_MODULE_SCOPE` (`'store'`)
   - Amplía **`normalizeDashboardOrder`** (y cualquier función que valide tamaño/permutación) para exigir la nueva longitud y el nuevo ítem obligatorio.

2. **`app/models/DashboardModuleSettings.ts`**
   - Añade el campo booleano en `visibility` del schema Mongoose (`default: true` o el default de producto).

3. **Migración datos (producción)**
   - Los documentos existentes **no tienen la nueva clave** hasta que un owner guarde configuración (merge rellena con default) o ejecutes una migración que inserte el booleano en `visibility` y el id en `order`.
   - Añadir el nuevo id **`siempre dentro del bloque tienda`** en arrays `order`: conviene insertarlo en `canonicalizeDashboardOrder`/scripts según donde quieras que aparezca por defecto (p. ej. al final del bloque store).

4. **`DashboardHomeContent.tsx`**
   - Crea el bloque JSX (similar a `weeklyEvents`, `mail`, etc.).
   - Regístralo en `blocks`. El módulo debe **mostrarse con `variant="inicio"`** (no aparecerá en Mi cuenta).

5. **`app/admin/configuracion/page.tsx`**
   - Añade etiqueta humano en `LABELS` para el nuevo id (el checklist de visibilidad y las listas de orden se generan con `dashboardModuleIdsForScope`).

6. **API PUT** (`app/api/admin/configuracion/route.ts`): si existe validación específica de `visibility`/`order`, actualízala.

7. **`load-dashboard-module-settings` / merges**: normalmente solo types; si algo asume tamaño fijo, actualízalo.

8. Documenta comportamiento esperado cuando **no hay tienda activa** (middleware / sesión) si el nuevo módulo hace llamadas desde otras vistas.

---

## Guía: añadir un módulo de **jugador** (`scope: player`)

Úsalo cuando el bloque muestra algo **principalmente ligado al usuario autenticado** (historial propio, descubrimiento global opcionalmente filtrado, stats del perfil…) y puedes hacer que **la tienda active u oculte** el widget para sus clientes virtuales sin que ese sea el “dueño semántico” de los datos.

### Checklist

Es el mismo flujo que un módulo `store`, con estas diferencias:

1. **`DASHBOARD_MODULE_SCOPE`** → `'player'`.

2. **Orden canónico por defecto**: `DEFAULT_DASHBOARD_ORDER` se construye concatenando **`dashboardModuleIdsForScope('store')` + `'player'`**. Tu nuevo ID quedará dentro del sufijo jugador manteniendo el orden relativo dentro de ese grupo cuando lo insertes ahí por migración/script.

3. **`DashboardHomeContent.tsx`**: registra el bloque en el mapa global; se renderiza sólo con **`variant="mi-cuenta"`** (no en Inicio).

4. **Copy**: si hace falta, ajusta `DASHBOARD_SECTION_COPY.player.description` (texto bajo el título en `/dashboard/mi-cuenta`). Los toggles siguen siendo **por tienda**.

5. **Datos/API**: si el recurso es **global** (p. ej. mazos públicos) documéntalo; si tiene **filtro por tienda opcional**, alinea el copy del bloque con la realidad técnica.

---

## Migraciones legacy de `order`

`dashboard-module-config.ts` contiene `migrateFiveModuleOrder`, `migrateFourModuleOrder`, `migrateLegacyDashboardOrder`. Al **añadir un séptimo módulo**:

- Todas estas funciones de migración pueden quedar obsoletas o deben extend **explícitamente** para no clasificar ordenes válidos modernos como “legacy rotos”.
- Planifica una **estrategia**: o bien aumentas tamaños esperados por migraciones, o limpias documentos muy antiguos con un script puntual que reescriba `order` usando `canonicalizeDashboardOrder` + defaults.

---

## Comportamiento al cambiar de tienda activa

- El cliente **monta nuevo layout** cuando cambias store (muchas vistas refetch); para configuración ya usada en queries de React relacionadas incluye sufijo por tienda donde aplique.
- **`mergeDashboardSettings` siempre canonicaliza orden** al leer: la primera carga después de código nuevo puede cambiar orden visual si el Mongo tenía orden interleaved antiguo, sin pérdida de permutación interna por alcance.

---

## Roles y permisos

- Quien puede **editar** visibilidad, orden y atajos: **solo owner** (`requireStoreOwnerSession` en `/api/admin/configuracion`).
- Los **usuarios estándar** sólo ven el resultado filtrado en `/dashboard`; no pueden reordenar módulos a nivel cuenta.

Este documento debería actualizarse cada vez que se agreguen IDs o se altere la semántica de `store`/`player`.
