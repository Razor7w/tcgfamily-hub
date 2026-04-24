# Changelog

Registro de cambios notables del proyecto. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y el versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Añadido

### Cambiado

### Corregido

## [0.9.0] - 2026-04-23

### Añadido

- **Deck builder** (`/dashboard/deck-builder`): búsqueda Limitless con **`format:standard` (y demás) siempre** en la petición; resolución de **imágenes** hacia `images.pokemontcg.io` y CDN Limitless para sets clásicos (p. ej. N1, N2, E2, TRR, UF, DF, SW) y HIF (Shiny Vault); diálogo de carta con **−1 / cantidad en el mazo / +1**; botón **Crear lista** que abre **Nueva lista** con el listado en **`sessionStorage`** y `?from=builder`.
- **Navegación**: menú **Mazos** (acordeón) con **Mis listas**, **Listas públicas** y **Armar mazo**.

### Cambiado

- **Copy en español latino** en menú, páginas de listas, deck builder, detalle, comunidad, PDF torneo, variantes y botones (p. ej. “Ver listado”, “Texto de la lista”).

### Corregido

- Fechas en cards de **listas públicas** (inicio y `/dashboard/decklists/publicos`): **solo fecha**, sin hora.

## [0.8.0] - 2026-04-23

### Añadido

- **Decklists públicos**: espacio **`/dashboard/decklists/publicos`** con listado, detalle, variantes en solo lectura y datos del autor; marcar mazos como públicos desde **Mis decklists**; API **`GET /api/decklists/public`** (sesión requerida) y **`PATCH /api/decklists/[id]`** con **`isPublic`**.
- **Inicio del dashboard**: tarjeta **Últimos mazos públicos** (hasta 3, por fecha de actualización); módulo **`recentPublicDecklists`** en **`/admin/configuracion`** (visibilidad y orden respecto al resto de bloques); parámetro **`?limit=`** en **`GET /api/decklists/public`** para respuestas ligeras.
- **Mis decklists** y **Decklists públicos**: búsqueda por nombre del mazo, **paginación** y filtros por período (**esta semana** / **este mes**, según **`updatedAt`**, semana desde lunes); helper **`app/lib/decklist-list-utils.ts`**.

### Cambiado

- Tarjeta de últimos mazos públicos en inicio: **cuadrícula 1 columna en móvil y 2 en escritorio**, ítems con superficie propia, estados hover/focus y cabecera más trabajada.
- **`DashboardModuleSettings`**: campo de visibilidad **`recentPublicDecklists`**; migración de orden guardado de **5** módulos al insertar el nuevo bloque.

### Corregido

- **`PublicDecklistVariantsPanel`**: pestañas derivadas sin **`setState`** sincrónico en efectos (compatibilidad con regla **`react-hooks/set-state-in-effect`**).

## [0.7.0] - 2026-04-20

### Añadido

- **Decklist**: módulo para pegar un decklist en texto, renderizarlo por secciones y abrir una vista **Open as Image** con grilla de cartas (zoom por carta). Incluye demo en **`/dashboard/decklist-demo`**.

### Cambiado

- **Mis correos** (`/dashboard/mail`): lista en **tarjetas** con **paginación** y layout mejorado (panel de código, acciones más claras, targets táctiles).
- **Registrar correo**: acciones en móvil reordenadas (primarias juntas) y texto explicativo movido a **icono de información**.
- **Deck image**: en móvil se muestra en **drawer** (bottom sheet) con grilla más compacta; en escritorio se ajusta el tamaño para ver más filas.

## [0.6.6] - 2026-04-27

### Cambiado

- **Registrar correo** (`RegisterMailDialog`): en **móvil**, **Cancelar** y **Registrar** comparten una fila a ancho completo y **Cargar múltiples** queda debajo como acción secundaria (texto).
- **Registrar correo**: el párrafo explicativo sale del cuerpo del modal; se accede con un **icono de información** en el título que abre un **popover** con el mismo texto.

## [0.6.5] - 2026-04-26

### Cambiado

- **Mis correos** (`/dashboard/mail`): la lista pasa de **tabla** a **tarjetas** con **paginación** (mejor lectura en móvil).
- **Mis correos — tarjetas**: layout en dos zonas en escritorio (ruta De/Para y panel de código), chips y acciones más claras; botón **Eliminar** visible en pantallas anchas.
- **`ButtonBarCode`**: modo opcional **`trigger="button"`** (“Ver código de barras”) para targets táctiles más grandes; el modo icono sigue siendo el predeterminado en el resto de la app.

## [0.6.4] - 2026-04-23

### Añadido

- **Correo — cupo diario**: límite de registros por usuario y día (hora Chile) con **`GET /api/mail/register-quota`**; validación en **`POST /api/mail`** (`onlyReceptor`). El tope es **configurable** en **`/admin/configuracion`** (`mailRegisterDailyLimit` en `DashboardModuleSettings`).
- **Correo — registro múltiple**: página **`/dashboard/mail/registrar-multiples`** con formulario por tarjetas (validación de RUT al escribir, envío en lote con barra de progreso y autoscroll); enlace desde **Mis correos** y flujo documentado en modal de ayuda (UI reducida).
- **Mis correos / Admin — eliminar**: confirmación con **modal MUI** en lugar de `window.confirm`.

### Cambiado

- **Correo**: la cuota cuenta solo correos **aún existentes**; al borrar un envío elegible se invalida la query de cupo. Registro múltiple envía el lote con **`fetch`** y una sola invalidación al final para evitar saltos de UI.

## [0.6.3] - 2026-04-22

### Añadido

- **Documentación**: [`README.md`](./README.md) orientado al producto (stack, entorno, enlaces); [`docs/API-AUTH.md`](./docs/API-AUTH.md) con convenciones de sesión admin y rutas cubiertas.
- **API**: helper [`requireAdminSession()`](./app/lib/api-auth.ts) usado de forma uniforme en rutas admin, gestión de usuarios y operaciones de correo solo administrador; **`GET /api/health`** con rate limit por IP (mitigación de abuso).
- **Cursor**: regla [`.cursor/rules/release-version-git-tag.mdc`](./.cursor/rules/release-version-git-tag.mdc) para incluir comandos `git tag` al cerrar versiones.
- **Eventos de la semana**: subcomponentes (`WeeklyEventsSectionHeader`, tira de días, paneles vacíos, chips del día); diálogos en archivos propios (**participantes**, **clasificación completa**, **ronda en curso**) con componente interno de contenido en cada uno.

### Cambiado

- **Rendimiento (carga diferida)**: `next/dynamic` para **`WeeklyEventsSection`** en inicio del dashboard y **`/dashboard/eventos`**; gráfico **Recharts** de ligas públicas en chunk aparte (`LeagueTopPlayersBarChart`).
- **Mis torneos** (`MyTournamentsHomeSection`): título del bloque aclarado para lectura más clara.

## [0.6.2] - 2026-04-21

### Añadido

- **Mis torneos**: API **`GET /api/events/my-tournaments-all`** con torneos en los que participa el usuario, ordenados por fecha de inicio; **`MyTournamentsHomeSection`** con conmutador **vista de todos los tiempos** (sin filtro semanal); **`TournamentWeekReportSection`** y hooks en **`useWeeklyEvents`** adaptados al modo histórico.
- **Emparejamientos / resumen de torneo** (`TournamentMatchRoundsCard`): acciones **sprite de mazo** y **compartir resumen**; **`DeleteCustomTournamentButton`** admite `fullWidth` y `sx` para integrarse mejor en el layout.

### Cambiado

- **Estadísticas de enfrentamientos** (`GET /api/events/my-matchup-stats`): orden de **slugs de mazo** según participación reciente en torneos (`pokemon-matchup-stats`).
- **Mis torneos — Semana**: tipografía y layout responsive; **reporte semanal** con tarjetas y subtítulos según modo semana vs todos los tiempos; **`WeekAnchorToolbar`** con botones más consistentes.
- **Detalle semanal** (`/dashboard/torneos-semana/[eventId]`): ajustes de layout alineados con las secciones de torneo.
- **Drawer «Compartir»** en emparejamientos: en **móvil** ancho completo; en **tablet/escritorio** ancho aproximado **⅔** de los topes previos (520/600/680 px y viewport).
- **Colocación manual** (`CustomTournamentManualPlacementSection`): lógica más simple y lectura del código.

## [0.6.1] - 2026-04-20

### Añadido

- **Mis torneos — Semana** (`/dashboard/torneos-semana`): botón **Ver todo** que muestra una **lista unificada** (calendario de la tienda + custom) ordenada por fecha/hora de inicio; botón **Filtros** con modal (**origen**: todos / solo oficiales / solo custom; **fechas** desde–hasta por día dentro de la semana seleccionada); **Vista por pestañas** para volver al modo Oficiales / Custom; chips **Oficial** / **Custom** por torneo en la vista unificada; **Reportar torneo** también en modo unificado. Estado del bloque reiniciado al cambiar de semana (`key` por lunes de la semana en `MyTournamentsHomeSection`).

## [0.6.0] - 2026-04-19

### Añadido

- **Dashboard — Estadísticas**: módulo `statistics` en la configuración global (`DashboardModuleSettings`): visibilidad y orden en **`/admin/configuracion`**; migración de orden guardado de **4** bloques insertando `statistics` justo después de **Mis torneos**.
- **Inicio del panel** (`/` bajo `/dashboard`): card **Estadísticas por mazo** con tabla resumida (**mazo**, **veces jugado**, **win rate**), hasta 6 filas y aviso si hay más en la vista completa; CTA a **`/dashboard/estadisticas`**.
- **Navegación**: enlace **Estadísticas** según `visibility.statistics`; la ruta **`/dashboard/estadisticas`** usa `DashboardModuleRouteGate` con `moduleId="statistics"`; API admin y `revalidatePath` al guardar configuración.
- **Estadísticas (página)**: botón en estado vacío para **añadir torneo custom** (mismo flujo que en el resto del panel).

### Cambiado

- **Accesos rápidos** (`DashboardQuickActions`): fondo **`background.paper`** en tema claro (alineado con otras cards).
- **Menú lateral del dashboard** (`DashboardUserNav`): fondo en **gradiente** por ítem y estados hover / selección.
- **Herramientas**: **Prettier** como dependencia de desarrollo, integración **`eslint-plugin-prettier/recommended`**, scripts **`format`** y **`format:check`**.

### Corregido

- ESLint / React: `react-hooks/set-state-in-effect` en detalle de evento admin y placement manual en custom; estadísticas (memoización compatible con React Compiler); `prefer-const` en rutas y XML; ejemplo **TanStack Query** con genéricos de `useMutation` (variables y contexto) para compilación correcta.

## [0.5.5] - 2026-04-18

### Añadido

- **Admin — Torneos custom** (`/admin/torneos-custom`): listado de torneos Pokémon con `tournamentOrigin: custom` (creador, fechas, récord, deck, enlace a la vista del jugador). API `GET /api/admin/custom-tournaments`.
- **Dashboard — Accesos rápidos**: atajos para **registrar correo** y **crear torneo custom** (mismo flujo que el resto del panel). Configuración en **`/admin/configuracion`** (`shortcuts` en `DashboardModuleSettings`) para mostrar u ocultar cada acceso por separado.

### Cambiado

- **Dashboard** (`DashboardQuickActions`): UI de accesos rápidos en tarjetas uniformes; versión **compacta en móvil** (dos columnas, sin párrafo introductorio, subtítulos ocultos en `xs`).
- **Correo** (`MailFlowExplainer` compact): en móvil, caja informativa reducida con botón «Ver paso a paso» en lugar del texto largo.
- **`ReportCustomTournamentDialog`**: formulario montado solo con el diálogo abierto (sin `useEffect` de reset al abrir); evita advertencias de React sobre `setState` en efectos.

### Corregido

- **`TournamentWeekReportSection`**: `list` derivado de `data?.tournaments` con `useMemo` para dependencias estables en los filtros memoizados.

## [0.5.4] - 2026-04-18

### Cambiado

- **Registro** (`/auth/register`): validación de **correo electrónico viable** compartida con la API (`validateEmailFormat` en [`app/lib/password-rules.ts`](./app/lib/password-rules.ts)): un solo `@`, dominio con extensión (TLD), sin espacios ni artefactos obvios; mensajes en el campo (`error` / `helperText`) alineados con RUT/Pop ID.

## [0.5.3] - 2026-04-18

### Corregido

- **`GET /api/events`**: import del modelo **`League`** para registrar el esquema en Mongoose antes de `populate("leagueId")`, evitando `MissingSchemaError` y el 500 en la vista semanal del dashboard.

## [0.5.2] - 2026-04-18

### Añadido

- **Dashboard — Eventos de la semana** (`WeeklyEventsSection`): chip con el **nombre de la liga** en la card «Detalle del evento» cuando el torneo tiene liga activa asignada; enlace a **`/ligas/[slug]`** (estilo secundario, icono `Leaderboard`, accesible).
- **`GET /api/events`** (lista semanal): `populate` de `leagueId` y campo **`league`** `{ name, slug }` en cada evento (solo ligas activas con datos válidos).

### Cambiado

- **Ligas** (`/ligas/[slug]`): la clasificación suma puntos por **récord W/L/T** por torneo (victoria 3, empate 1, derrota 0) a partir de los datos del participante; **sin** tabla por posición final ni separación por categoría de edad. API `GET /api/leagues/[slug]` devuelve `standings`, `chartTop` y `league.scoring`. Agregación en [`app/lib/league-aggregate.ts`](./app/lib/league-aggregate.ts); textos en [`app/lib/league-public-copy.ts`](./app/lib/league-public-copy.ts).
- **Tope de ronda** (`dashboardRoundCap`): si está configurado en el evento, la liga usa el **snapshot** de emparejamientos de la última ronda guardada con `roundNum ≤ tope` (no cuenta rondas posteriores). Detalle opcional `leagueRoundBasis` en la respuesta pública.
- **Admin — Ligas** (`/admin/ligas`): formulario sin «puntos por posición»; aviso de puntuación fija 3/0/1 y textos de ayuda actualizados.

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

- **Detalle del evento** (columna izquierda): el aviso _«Preinscripción hasta las …»_ **no** se muestra si el estado es **`close`**.
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
- Flujo de **Reportar torneo**: diálogo ampliado (posición opcional); invalidación de caché `my-recent-tournaments` al guardar deck, rondas o al crear/borrar custom.

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

Cuando publiques tags `vX.Y.Z` en GitHub, puedes añadir al final de este archivo enlaces tipo _Keep a Changelog_ (`[Unreleased]: …/compare/v0.9.0…HEAD`, `[0.9.0]: …/compare/v0.8.0…v0.9.0`, `[0.8.0]: …/compare/v0.7.0…v0.8.0`, `[0.7.0]: …/compare/v0.6.6…v0.7.0`, `[0.6.6]: …/compare/v0.6.5…v0.6.6`, `[0.6.5]: …/compare/v0.6.4…v0.6.5`, `[0.6.4]: …/compare/v0.6.3…v0.6.4`, `[0.6.3]: …/compare/v0.6.2…v0.6.3`, `[0.6.2]: …/compare/v0.6.1…v0.6.2`, `[0.6.1]: …/compare/v0.6.0…v0.6.1`, `[0.6.0]: …/compare/v0.5.5…v0.6.0`, `[0.5.5]: …/compare/v0.5.4…v0.5.5`, `[0.5.4]: …/compare/v0.5.3…v0.5.4`, `[0.5.3]: …/compare/v0.5.2…v0.5.3`, `[0.5.2]: …/compare/v0.5.1…v0.5.2`, `[0.5.1]: …/compare/v0.5.0…v0.5.1`, `[0.5.0]: …/compare/v0.4.6…v0.5.0`, `[0.4.6]: …/compare/v0.4.5…v0.4.6`, `[0.4.5]: …/compare/v0.4.4…v0.4.5`, `[0.4.4]: …/compare/v0.4.3…v0.4.4`, `[0.4.3]: …/compare/v0.4.2…v0.4.3`, `[0.4.2]: …/compare/v0.4.1…v0.4.2`, `[0.4.1]: …/compare/v0.4.0…v0.4.1`, `[0.4.0]: …/compare/v0.3.0…v0.4.0`, `[0.3.0]: …/compare/v0.2.1…v0.3.0`, etc.).
