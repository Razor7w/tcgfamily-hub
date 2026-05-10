# Spike: Portal multitienda (multi-organización)

Documento exploratorio — **solo planificación**. No prescribe implementación concreta; resume qué habría que abordar, riesgos y líneas de solución al evolucionar el portal hacia varias **tiendas** (unidades organizativas: club/sede/franquicia/tenant lógico) sobre la misma aplicación.

**Contexto del repo actual (referencia rápida):** Next.js, sesión NextAuth basada en **JWT**, MongoDB/Mongoose, modelos de dominio (`User`, `League`, `WeeklyEvent`, `DashboardModuleSettings`, `SavedDecklist`, `Mails`, etc.) sin aislamiento explícito por tienda documentado.

---

## 1. Objetivos del spike

- Alinear el significado de **“tienda”** con el negocio (¿cada club? ¿cada sucursal? ¿cada marca?).
- Definir **límites de datos**: qué es global vs pertenece a una tienda vs es compartido entre varias.
- Elegir (o descartar) **estrategias de tenancy**: una base compartida con `storeId`, esquema por tenant, base por tenant, etc.
- Planificar **authz** (quién puede ver/cambiar qué en cada tienda) sin romper el login actual de forma abrupta.

**Resultado esperado del spike:** decisiones escritas + lista ordenada de tareas técnicas + riesgos mitigados, antes de tocar código en serio.

---

## 2. Definiciones y alcance

| Término | Uso en este documento |
|--------|------------------------|
| **Tienda** | Unidad organizativa con datos y configuración propios (equivalente a *tenant lógico* o *organización*). |
| **Usuario** | Identidad global (email/cuentas OAuth); puede pertenencer a una o más tiendas con roles distintos. |
| **Global** | Recursos sin `storeId` o con políticas explícitas “plataforma” (ej. súper admins). |

**Aclaración:** “Multitienda” aquí es **multi-organización dentro de una misma instancia del producto**, no necesariamente e-commerce ni múltiples dominios de venta salvo que el negocio lo defina así.

---

## 3. Lo que probablemente cambia respecto al diseño actual

1. **Modelo de datos:** casi todo lo que hoy es “del portal” necesitará **alcance por tienda** (`storeId` o equivalente) o documentación explícita de por qué sigue siendo global.
2. **Sesión / JWT:** hoy el token lleva claims de usuario global; habrá que decidir si se añade **tienda activa** (`activeStoreId`), lista de tiendas accesibles, y roles por tienda.
3. **APIs:** cada lectura/escritura debe **filtrar por tienda** y validar **membresía**; riesgo alto de fugas si solo se filtra en el cliente.
4. **UI:** selector de tienda, navegación y caché (React Query keys, Zustand) deben incluir el contexto de tienda.
5. **Operaciones:** backups, reporting, integraciones (correo, etc.) deben saber de qué tienda es el dato.

---

## 4. Decisiones a tomar (antes de implementar)

### 4.1 Resolución de “tienda activa”

| Enfoque | Pros | Contras |
|--------|------|--------|
| **Subdominio** (`tienda-a.dominio.com`) | URL clara, buen aislamiento mental | DNS, cookies, CORS, Vercel preview; más ops |
| **Path** (`/t/tienda-a/...`) | Simple de desplegar; un solo dominio | Rutas y links más verbosos; middleware |
| **Solo estado (header/query)** después del login | Rápido de prototipar | Fácil olvidar el contexto en deep links/compartidos |
| **Híbrido** (login global + persistir tienda activa en cookie/JWT + redirect) | Buen UX | Coordinar servidor y cliente |

**Spike:** probar una opción barata (ej. cookie `activeStoreId` + validación servidor) antes de comprometer subdominios.

### 4.2 Estrategia de datos

| Estrategia | Pros | Contras |
|-----------|------|--------|
| **Una colección / esquema + `storeId`** en documentos | Una operación de deploy; reporting cruzado simple | Migración amplia; índices compuestos obligatorios; riesgo de queries sin filtro |
| **Base de datos por tienda** | Aislamiento fuerte | Coste, backups, migraciones, conexiones; difícil reporting global |
| **Colección por tienda** (nombres dinámicos) | Evita mezcla | Antipatrón en Mongo para muchos tenants; tooling y migraciones penosas |

Para este repo, lo habitual es **Mongo compartido + `storeId`** con índices y tests de seguridad.

### 4.3 Usuarios: global vs por tienda

- **Cuenta global** (recomendado para UX): un email, varias membresías `{ storeId, role, ... }`.
- **Alternativa:** usuario duplicado por tienda (suele complicar OAuth y recuperación de contraseña).

**Implicación NextAuth:** el adapter y callbacks JWT/session deben poder **inyectar membresías** y **rol por tienda** sin confundir con el `role` global actual (`admin` / `user`).

---

## 5. Plan paso a paso sugerido

### Fase A — Descubrimiento y contrato de producto (1–2 iteraciones)

1. Listar **entidades** y marcar cada una: *global*, *por tienda*, *compartida con reglas*.
2. Definir **roles por tienda** (owner, admin tienda, staff, miembro solo lectura…).
3. Definir **casos borde**: usuario sin tienda; invitaciones; usuario en varias tiendas; tienda archivada.
4. Definir **super-admin de plataforma** (si aplica): ve todas las tiendas vs solo soporte auditoría.

### Fase B — Modelo conceptual y seguridad

5. Diseñar colección o subdocumentos **`Membership`** (userId, storeId, role, timestamps) o equivalente embebido en `User`.
6. Especificar **`Store`** (nombre, slug, estado, configuración branding/módulos si aplica).
7. Documentar **matriz de permisos** (recurso × rol × método HTTP).

### Fase C — Persistencia MongoDB

8. Añadir `storeId` a modelos que deban estar acotados; **índices compuestos** `{ storeId: 1, ... }` alineados con las queries reales.
9. Plan de **migración**: tienda por defecto “legacy” para datos existentes; script idempotente; ventana de doble escritura si hace falta.
10. Revisión de **único dentro de tienda** (ej. slug de liga repetible entre tiendas pero no dentro de una).

### Fase D — Autenticación y sesión

11. Extender JWT/session con **`activeStoreId`** y lista corta de `storeIds` o fetch lazy de membresías.
12. **Callbacks** NextAuth: al login, establecer tienda por defecto (última usada o primera membresía).
13. Endpoint o server action para **cambiar tienda activa** con verificación de membresía.

### Fase E — Capa API y servidor

14. Middleware o helper **`requireStoreContext`** que:(a) lee tienda desde cookie/header/path;(b) valida sesión y membresía;(c) inyecta `storeId` en handlers.
15. Auditar **todas** las rutas `app/api/**` y modelos para **filtrado obligatorio**; tests de regressión (“usuario de tienda A no lee tienda B”).
16. **Rate limiting** y CSRF: re-evaluar límites actuales por tienda/usuario si el producto cambia superficie.

### Fase F — Frontend

17. **Selector de tienda** en shell/layout; persistencia de última tienda (cookie + servidor).
18. Ajustar **React Query**: keys que incluyan `storeId`; invalidación al cambiar tienda.
19. **Zustand**: evitar estado global que mezcle datos de dos tiendas al cambiar de contexto sin remount/revalidación.

### Fase G — Observabilidad y operación

20. Logs estructurados con **`storeId`** (donde aplique RGPD/legal, anonimización).
21. Backups y restauración por tenant si el modelo de datos lo permite; runbooks.

### Fase H — Piloto y rollout

22. Habilitar multitienda en **staging** con 2 tiendas sintéticas; pruebas de fuga de datos.
23. **Feature flag**: habilitación gradual; posible período donde datos legacy siguen en “tienda default”.

---

## 6. Problemas conocidos y riesgos

| Riesgo | Por qué importa |
|--------|----------------|
| **Fugas de datos** por query sin `storeId` | Impacto legal y de confianza; difícil de detectar solo con QA manual |
| **JWT hinchado** con demasiadas tiendas/membresías | Cookies demasiado grandes; mejor IDs + fetch en servidor |
| **Migración incompleta** | Mezcla de documentos con y sin `storeId`; bugs intermitentes |
| **Índices inadecuados** | Degradación de rendimiento cuando el volumen crece por tenant |
| **Roles ambiguos** | `admin` global vs admin de tienda; confusiones en UI y permisos |
| **Integraciones externas** (correos, OAuth redirect URLs) | Multi-dominio o multi-marca aumenta configuración |
| **Cachés** (Vercel, CDN, React Query) | Servir datos de tienda equivocada si la clave de caché no incluye contexto |

---

## 7. Posibles soluciones / mitigaciones

- **Fugas:** capa única `withStore(scope)` para queries Mongoose; tests de contrato por ruta; linters/script que liste `find` sin `storeId` en colecciones sensibles.
- **JWT grande:** solo `activeStoreId` + `membershipVersion`; revalidar membresía en servidor en operaciones críticas.
- **Migración:** tienda `_default`; job que marca documentos legacy; asserts en desarrollo si falta `storeId` donde sea obligatorio.
- **Índices:** spike de `explain()` en rutas más usadas antes de producción ([documentación indexing MongoDB](https://www.mongodb.com/docs/manual/indexes/) cuando toque optimizar).
- **Roles:** nomenclatura explícita `platformAdmin` vs `storeAdmin`; nunca reusar `admin` ambiguamente sin prefijo.

---

## 8. Dependencias externas típicas

- **Hosting (Vercel):** variables de entorno por entorno están bien; multitienda suele residir en app y BD, no en duplicar proyectos salvo modelo enterprise.
- **Google OAuth:** URLs autorizadas y consent screen si hay varios dominios.
- **Correos / plantillas:** variables por tienda (remitente, footer legal).

---

## 9. Criterios de “listo para construir” (salida del spike)

- Diagrama breve de entidades global vs por tienda aceptado por producto.
- Decisión registrada: resolución de tienda activa + estrategia de datos.
- Matriz inicial de roles y políticas por recurso acordada.
- Lista priorizada de modelos/APIs a migrar (`User`, `League`, `WeeklyEvent`, `DashboardModuleSettings`, …) con orden de migración.

---

## 10. Lo que este documento no cubre

- Implementación ni estimaciones por sprint (dependen del alcance exacto).
- Aspectos legales detallados (RGPD entre tiendas); conviene revisión jurídica si hay tratamiento de datos cruzados.

---

*Generado como spike técnico/producto para orientar trabajo futuro; revisar después de cerrar definición de negocio de “tienda”.*
