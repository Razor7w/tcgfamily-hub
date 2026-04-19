# Changelog

Registro de cambios notables del proyecto. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y el versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Añadido

### Cambiado

### Corregido

## [0.5.1] - 2026-04-18

### Cambiado

- **Ligas** (`/ligas/[slug]`): clasificación **por división de edad** (Júnior, Sénior, Máster); la API pública `GET /api/leagues/[slug]` devuelve `standingsByCategory` (tabla y gráfico por pestaña). Textos informativos alineados con el manual de Ligas de Play! Pokémon (TOM, archivo .tdf, Play! Tools; independiente de los Puntos de Campeonato oficiales). Agregación en [`aggregateLeagueStandingsByCategory`](./app/lib/league-aggregate.ts) y copy en [`app/lib/league-public-copy.ts`](./app/lib/league-public-copy.ts).

### Corregido

- **Admin y dashboard — Correos**: la búsqueda por código trata como equivalentes los separadores que envían algunos lectores de código de barras (p. ej. apóstrofos) y los guiones del código almacenado (`19'04'2026'001` vs `19-04-2026-001`) mediante [`normalizeMailCodeForSearch`](./app/lib/mail-code-search.ts).

## [0.5.0] - 2026-04-18

### Añadido

- **Ligas** (torneos oficiales): modelo `League`, campo opcional `WeeklyEvent.leagueId`, CRUD en **`/admin/ligas`** y entrada en el menú admin. Tabla configurable de **puntos por posición** y regla opcional de **mejores N torneos** por jugador.
- **API** `GET/POST /api/admin/leagues`, `GET/PATCH/DELETE /api/admin/leagues/[id]` y **`GET /api/leagues/[slug]`** (pública, solo ligas activas) con agregación desde `tournamentStandings` de eventos cerrados ([`aggregateLeagueStandings`](./app/lib/league-aggregate.ts)).
- **Página pública** **`/ligas/[slug]`**: clasificación, resumen de torneos, gráfico de barras (**Recharts**) y detalle por jugador. Dependencias **`recharts`** y **`react-is`**.
- **Admin — Eventos** (`/admin/eventos`): filtros de semana y rango de fechas en **modal**; chip de liga y selector **Liga (opcional)** al crear/editar evento.
- **Admin — Detalle de evento** (`/admin/eventos/[id]`): botón **Ajustes** para asignar o quitar liga; bloque **Dashboard de jugadores** con **tope de ronda** (`dashboardRoundCap`) para limitar qué ronda ven los jugadores en el panel público.

### Cambiado

- Hooks de admin/eventos invalidan la query **`league-public`** cuando afectan datos relevantes para la clasificación de ligas.

## [0.4.6] - 2026-04-23

### Añadido

- **Admin — Configuración** (`/admin/configuracion`): sustituye la ruta **`/admin/dashboard-modules`** (redirección automática al nuevo path). Incluye apartado **Correo (Resend)** para activar o desactivar el envío del aviso cuando el admin marca un envío como **recepcionado en tienda** (persistido en `DashboardModuleSettings.resendNotifyPickupInStoreEnabled`, por defecto activo).
- API unificada **`GET`/`PUT /api/admin/configuracion`**: devuelve y actualiza bloques del dashboard y/o el flag de correo (cuerpo parcial permitido).
- [`getResendNotifyPickupInStoreEnabled`](./app/lib/get-resend-notify-pickup-enabled.ts) usada en [`PUT` `/api/mail/[id]`](./app/api/mail/[id]/route.ts) antes de llamar a Resend.

### Cambiado

- Eliminada **`/api/admin/dashboard-modules`** en favor de **`/api/admin/configuracion`**. Hooks de admin usan la query key **`["admin", "configuracion"]`**.

## [0.4.5] - 2026-04-22

### Añadido

- **Dashboard — Eventos de la semana** (`WeeklyEventsSection`): con torneo en **`close`**, botón **«Ver standing completo»** y modal **Clasificación completa** con la tabla ordenada por categoría (hasta 512 filas por categoría). Datos vía **`GET /api/events/[id]?standings=full`** y hook [`useWeeklyEventFullStandings`](./app/hooks/useWeeklyEvents.ts).
- [`buildTournamentStandingsPublic`](./app/lib/weekly-event-public.ts): opción `maxRowsPerCategory` y constante **`PUBLIC_STANDINGS_FULL_MAX`** para la respuesta ampliada sin duplicar lógica.

### Cambiado

- **Detalle del evento** (columna izquierda): el aviso *«Preinscripción hasta las …»* **no** se muestra si el estado es **`close`**.
- **Modal de clasificación completa**: layout flex en el `Dialog` y variante `dialog` en **`TournamentFinishedStandingsTabs`** para evitar **doble scrollbar** (scroll principal solo en la tabla).

## [0.4.4] - 2026-04-21

### Añadido

- **Admin — Eventos de la cartelera** (`/admin/eventos`): bloque **Vista por semana** con el mismo selector de rango (lunes–domingo) que en el dashboard; la lista muestra solo eventos cuya fecha de inicio cae en esa semana (hora local). Mensaje dedicado si no hay eventos en la semana pero sí en otras fechas.
- Componente compartido [`WeekRangeNavigator`](./app/components/events/WeekRangeNavigator.tsx) y utilidad [`isEventInLocalWeek`](./app/components/events/weekUtils.ts) para filtrar por semana.

### Cambiado

- **Dashboard — Eventos de la semana** (`WeeklyEventsSection`): el selector de semana reutiliza `WeekRangeNavigator` (sin cambio de comportamiento).

## [0.4.3] - 2026-04-20

### Cambiado

- **Dashboard — Eventos de la semana** (`WeeklyEventsSection`): si el torneo oficial está en estado **`close`**, la columna derecha muestra **clasificación final** (tabs por categoría, tu puesto y récord si aplicas) en lugar del formulario de preinscripción cerrada; emparejamiento de ronda solo en **`running`**. Eliminado el modal duplicado solo de clasificación.
- **Clasificación pública** ([`buildTournamentStandingsPublic`](./app/lib/weekly-event-public.ts)): la tabla por categoría en la API y la UI lista como máximo el **top 4**; la posición del usuario en «Tu resultado» sigue resolviéndose con el orden completo del torneo.

## [0.4.2] - 2026-04-19

### Añadido

- **Admin — Pegar evento** (`/admin/eventos`): botón **«Crear plantilla»** que rellena el área de texto con [`DEFAULT_PASTE_EVENT_FLYER_TEMPLATE`](./app/lib/parse-pasted-event-flyer.ts) (mismo contenido que el placeholder).

### Cambiado

- **Cupo en el texto del cartel**: el cupo se indica solo con una línea al final del pegado (p. ej. **«Cupos 16»**); ya no hay campo numérico aparte. La plantilla de ejemplo incluye esa línea; si se omite o se borra, el cupo queda ilimitado (máximo API).
- **Parser** [`parse-pasted-event-flyer`](./app/lib/parse-pasted-event-flyer.ts): reconoce líneas dedicadas **«Cupos N»** (plural) para fijar `maxParticipants`.

## [0.4.1] - 2026-04-18

### Cambiado

- **Dashboard — Eventos de la semana** (`WeeklyEventsSection`): si el cupo del evento es el máximo permitido (**2048**, ilimitado práctico), ya no se muestra el chip `inscritos/máximo` junto al horario ni la fila **Cupo** con barra de progreso (alineado con la etiqueta «Ilimitado» en admin).
- **Selector horizontal de días** (móvil): scroll automático para que el día seleccionado sea visible; en **sábado y domingo** el carrusel hace scroll **hasta el final** (`scrollWidth − clientWidth`) en lugar de centrar con `scrollIntoView`, para que el fin de semana no quede cortado a la derecha.

## [0.4.0] - 2026-04-17

### Añadido

- **Admin — Pegar evento** (`/admin/eventos`): botón **«Pegar evento»** abre un modal con un campo de texto para pegar el cartel (título en la primera línea, fecha tipo «18 DE ABRIL 17:00», valor, lugar, notas de formato y premios). Genera un torneo oficial vía `POST /api/admin/events` usando el parser [`app/lib/parse-pasted-event-flyer.ts`](./app/lib/parse-pasted-event-flyer.ts).
- **Cupo desde el texto**: si el pegado incluye líneas explícitas de cupo o plazas (`Cupo: N`, `Hasta N jugadores`, etc.), se usa ese número; si **no** se menciona cupo, se guarda el máximo permitido por API (**2048**) como cupo prácticamente ilimitado. No se interpreta «máx N» dentro de líneas de premios (p. ej. top %).
- **Etiqueta «Ilimitado»** en la lista y el detalle de admin cuando el cupo es ≥ 2048 (constante `WEEKLY_EVENT_PARTICIPANTS_MAX`).

### Cambiado

- **Panel admin de eventos de cartelera** (`/admin/eventos` y APIs bajo `/api/admin/events`): solo gestionan eventos **oficiales** (`tournamentOrigin` distinto de `custom`). El listado GET filtra custom; al crear desde admin se fija `tournamentOrigin: "official"`; PATCH/DELETE y rutas anidadas (participantes, TDF, ronda, standings) responden **404** si el ID corresponde a un torneo custom, para coherencia y seguridad.

## [0.3.0] - 2026-04-17

### Añadido

- **Torneos custom** (creación sin calendario de tienda): API `POST /api/events/custom-tournament`, estado persistido como cerrado, sin campo de lugar; posición opcional al crear (**categoría**, **puesto** o **DNF**) guardada en `participants[].manualPlacement` y mostrada como en torneos oficiales en listados, detalle y tarjetas.
- **Eliminar torneos custom**: `DELETE /api/events/[id]` (solo creador); UI en detalle y en el reporte por semana; campo `canDeleteCustomTournament` en el detalle del evento.
- **Módulo de dashboard independiente «Mis torneos»** (`myTournaments`), separado de **«Eventos de la semana»** (`weeklyEvents`): configuración en admin, orden propio, menú lateral y `DashboardModuleRouteGate` en rutas bajo `/dashboard/torneos-semana`.
- **Resumen en el inicio del dashboard**: últimos **2** torneos con API `GET /api/events/my-recent-tournaments`, tarjetas con récord W‑L‑T, posición y sprites de mazo cuando hay datos; componente `MyTournamentsDashboardSummary` y factor común `buildMyTournamentWeekItemFromLean`.
- **Pestañas** en `/dashboard/torneos-semana` (oficiales vs custom) y mejoras de UX en chips de estado en móvil.
- **Autoscroll en móvil** al abrir el formulario de ronda en `TournamentMatchRoundsCard`.
- Atribución **«Powered by TcgFamily hub»** en el drawer de compartir resumen.

### Cambiado

- Listados y APIs de «mis torneos» reutilizan la construcción unificada de ítems (incluye migración de orden antiguo de 3 módulos a 4 en `mergeDashboardSettings`).
- Flujo de **Reportar torneo custom**: diálogo ampliado (posición opcional); invalidación de caché `my-recent-tournaments` al guardar deck, rondas o al crear/borrar custom.

## [0.2.1] - 2026-04-17

### Añadido

- **Versión visible en la UI** (valor de `package.json` al compilar): pie en login y registro; texto bajo el menú lateral en dashboard y admin.
- Guía [`docs/RELEASES.md`](./docs/RELEASES.md) para el flujo de nuevas versiones (changelog, tag, deploy).

## [0.2.0] - 2026-04-17

### Añadido

- Panel admin para **orden y visibilidad** de módulos del dashboard (puntos de tienda, correo, eventos).
- Carga de esa configuración en **servidor** (`/dashboard` y `/admin`) con contexto React, sin endpoint público de solo lectura para los módulos.
- **Correo transaccional** (Resend) cuando el admin marca un envío como recepcionado en tienda; variables de entorno documentadas para remitente y comportamiento en desarrollo.
- Documentación de **versionado** en `VERSIONING.md` y este changelog.

### Cambiado

- Actualizaciones de correo en cliente: menos refetches innecesarios de la lista al alternar estados (TanStack Query).

### Corregido

- Navegación lateral en **admin** que reutiliza el mismo menú que el dashboard: el contexto de módulos está disponible también bajo `/admin` (evita error en runtime).

## [0.1.0]

Línea base anterior en `package.json` antes de este changelog; el detalle de cambios queda en el historial de git.

Cuando publiques tags `vX.Y.Z` en GitHub, puedes añadir al final de este archivo enlaces tipo *Keep a Changelog* (`[Unreleased]: …/compare/v0.5.1…HEAD`, `[0.5.1]: …/compare/v0.5.0…v0.5.1`, `[0.5.0]: …/compare/v0.4.6…v0.5.0`, `[0.4.6]: …/compare/v0.4.5…v0.4.6`, `[0.4.5]: …/compare/v0.4.4…v0.4.5`, `[0.4.4]: …/compare/v0.4.3…v0.4.4`, `[0.4.3]: …/compare/v0.4.2…v0.4.3`, `[0.4.2]: …/compare/v0.4.1…v0.4.2`, `[0.4.1]: …/compare/v0.4.0…v0.4.1`, `[0.4.0]: …/compare/v0.3.0…v0.4.0`, `[0.3.0]: …/compare/v0.2.1…v0.3.0`, etc.).
