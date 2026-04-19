# TCGFamily HUB

Aplicación web (**Next.js** + **React** + **MUI**) para el ecosistema TCG Family: panel de jugadores, eventos semanales, torneos custom, correo, ligas públicas y administración de eventos en tienda.

## Requisitos

- **Node.js** 20+ (recomendado: la versión que indique el equipo o CI).
- **MongoDB** accesible con URI (local o Atlas).
- Cuenta **Google Cloud** (OAuth) y proyecto **Resend** si usas las funciones de correo en producción.

## Puesta en marcha

1. Clona el repositorio e instala dependencias:

   ```bash
   yarn install
   ```

2. Variables de entorno: copia [`.env.example`](./.env.example) a `.env.local` y completa al menos `MONGODB_URI`, `AUTH_SECRET`, `AUTH_URL`, y las claves de Google OAuth. El detalle de cada variable está comentado en `.env.example`.

3. Arranca el servidor de desarrollo:

   ```bash
   yarn dev
   ```

4. Abre [http://localhost:3000](http://localhost:3000).

Build de producción local:

```bash
yarn build
yarn start
```

## Scripts

| Script            | Descripción                          |
| ----------------- | ------------------------------------ |
| `yarn dev`        | Servidor de desarrollo Next.js       |
| `yarn build`      | Compilación de producción            |
| `yarn start`      | Sirve el build (tras `yarn build`)   |
| `yarn lint`       | ESLint                               |
| `yarn format`     | Prettier (escribir)                |
| `yarn format:check` | Prettier (solo comprobar)        |

## Documentación del proyecto

- **Versionado y changelog:** [`CHANGELOG.md`](./CHANGELOG.md), [`VERSIONING.md`](./VERSIONING.md).
- **Publicar releases:** [`docs/RELEASES.md`](./docs/RELEASES.md).
- **Autenticación en APIs (admin, health, etc.):** [`docs/API-AUTH.md`](./docs/API-AUTH.md).

La **versión visible** en login, registro y barra lateral del panel coincide con el campo `"version"` de [`package.json`](./package.json) (valor del último build).

## Stack principal

- **Next.js** (App Router), **TypeScript**, **Tailwind** (PostCSS), **MUI** + Emotion.
- **MongoDB** con **Mongoose**; **NextAuth** (Auth.js v5) para sesiones y OAuth.
- **TanStack Query** en el cliente; **Resend** para correo transaccional donde aplique.

## Más sobre Next.js

La documentación oficial de Next.js está en [https://nextjs.org/docs](https://nextjs.org/docs). El despliegue en **Vercel** es el flujo habitual para este tipo de proyecto; variables de entorno se configuran en el panel del proyecto o con `vercel env`.
