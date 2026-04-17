# Changelog

Registro de cambios notables del proyecto. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y el versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Añadido

### Cambiado

### Corregido

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

Cuando publiques tags `vX.Y.Z` en GitHub, puedes añadir al final de este archivo enlaces tipo *Keep a Changelog* (`[Unreleased]: …/compare/v0.2.0…HEAD`, etc.).
