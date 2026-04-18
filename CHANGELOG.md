# Changelog

Registro de cambios notables del proyecto. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y el versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Añadido

### Cambiado

### Corregido

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

Cuando publiques tags `vX.Y.Z` en GitHub, puedes añadir al final de este archivo enlaces tipo *Keep a Changelog* (`[Unreleased]: …/compare/v0.4.1…HEAD`, `[0.4.1]: …/compare/v0.4.0…v0.4.1`, `[0.4.0]: …/compare/v0.3.0…v0.4.0`, `[0.3.0]: …/compare/v0.2.1…v0.3.0`, etc.).
