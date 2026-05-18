brew install mongodb-database-tools

# 1) Exportar desde el servidor remoto (ajusta URI y nombre de base)
mongodump --uri="mongodb+srv://USER:PASS@cluster.mongodb.net/NOMBRE_BD" --out=./mongo-backup
# 2) Restaurar en local (apunta al contenedor/puerto local)
mongorestore --uri="mongodb://localhost:27017" ./mongo-backup/NOMBRE_BD

---

## Scripts de migración (MongoDB / multitenant)

Ejecutar **desde la raíz del repositorio**, con variables de entorno cargadas (en particular la conexión a MongoDB, p. ej. `MONGODB_URI` en `.env.local`).

### Orden recomendado

1. **`bootstrap-multitenancy.ts`** — Una vez por entorno al adoptar multitenant: crea la tienda primaria `tcgfamily` si no existe, migra colecciones sin `storeId`, ajusta `DashboardModuleSettings`, copia wallet legacy a `storeCredits` y asigna `StoreMembership` owner en la primaria a usuarios con `role: 'admin'`.

2. **`migrate-user-role.ts`** — Puede ir después del bootstrap: asegura tienda `tcgfamily`, rellena `role: 'user'` donde falte, y asigna `defaultStoreId` a la tienda primaria solo en usuarios **sin** preferencia guardada (campo ausente o `null`).

3. **`grant-store-owner.ts`** — Opcional: otorga rol **owner** en una tienda (por slug) a **un** usuario por email.

### Comandos

Bootstrap multitenant:

```bash
npx tsx --env-file=.env.local app/scripts/bootstrap-multitenancy.ts
```

Migración de roles + tienda primaria + `defaultStoreId`:

```bash
npx tsx --env-file=.env.local app/scripts/migrate-user-role.ts
```

Owner en una tienda (por defecto la primaria `tcgfamily`):

```bash
npx tsx --env-file=.env.local app/scripts/grant-store-owner.ts correo@ejemplo.com
```

Otra tienda por slug:

```bash
npx tsx --env-file=.env.local app/scripts/grant-store-owner.ts correo@ejemplo.com tier0
```

### Notas

- **`tsx`**: suele invocarse con `npx tsx`.
- **Producción**: sustituir `.env.local` por el archivo de entorno del servidor o exportar las variables en la shell antes de ejecutar.
- **Idempotencia**: re-ejecutar los scripts en general no duplica lo ya migrado; `migrate-user-role` **no pisa** un `defaultStoreId` que el usuario ya haya guardado en perfil. Forzar la primaria en todos los usuarios es un caso aparte (consulta / script puntual en Mongo).

### Referencia en el código

- `app/scripts/bootstrap-multitenancy.ts`
- `app/scripts/migrate-user-role.ts`
- `app/scripts/grant-store-owner.ts`

---

## Índices en Atlas (producción)

En **producción** los índices definidos en `app/models/*.ts` **no se crean solos** al desplegar (salvo que la app ejecute `syncIndexes` para una colección concreta; hoy solo **correos** lo hace al conectar — ver `app/lib/mongodb.ts`).

Tras cambios de modelos o optimización de queries, revisar en mongosh:

```javascript
db.<colección>.getIndexes()
```

Base de datos (variable `MONGODB_DB_NAME`, por defecto `tcgfamily-hub`):

```javascript
use tcgfamily-hub
```

### Índices de rendimiento (multitenant / tiendas)

Ya suelen crearse a mano tras el deploy de optimizaciones:

```javascript
db.stores.createIndex({ isActive: 1, name: 1 })
db.weeklyevents.createIndex({ storeId: 1, kind: 1, state: 1, startsAt: -1 })
db.storememberships.createIndex({ userId: 1, role: 1 })
```

**Membresías — único por usuario y tienda** (altas en admin, `findOne({ userId, storeId })`):

```javascript
db.storememberships.createIndex(
  { userId: 1, storeId: 1 },
  { unique: true }
)
```

**Tiendas — slug** suele existir ya como índice único (`slug` es `unique` en el schema). Si no aparece en `getIndexes()`:

```javascript
db.stores.createIndex({ slug: 1 }, { unique: true })
```

### Ligas y configuración por tienda

```javascript
db.leagues.createIndex(
  { storeId: 1, slug: 1 },
  { unique: true, sparse: true }
)

db.leagues.createIndex(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { storeId: { $exists: false } }
  }
)

db.dashboardmodulesettings.createIndex(
  { storeId: 1 },
  {
    unique: true,
    partialFilterExpression: { storeId: { $exists: true } }
  }
)
```

### Correos (`mails`)

La app intenta sincronizar índices de correo al conectar. Si faltan en Atlas:

```javascript
db.mails.createIndex(
  { storeId: 1, code: 1 },
  {
    unique: true,
    name: 'mails_storeId_code_unique',
    partialFilterExpression: { storeId: { $type: 'objectId' } }
  }
)

db.mails.createIndex(
  { code: 1 },
  {
    unique: true,
    name: 'mails_legacy_missing_store_code_unique',
    partialFilterExpression: { storeId: null }
  }
)

db.mails.createIndex({ fromUserId: 1, createdAt: 1 })
```

### Usuarios y otras colecciones

```javascript
// Import CSV de puntos (RUT)
db.users.createIndex({ rut: 1 })

// Listas públicas / mazos del usuario
db.saveddecklists.createIndex({ userId: 1, updatedAt: -1 })
db.saveddecklists.createIndex({ isPublic: 1, updatedAt: -1 })

// NextAuth (si la colección existe en esta BD)
db.accounts.createIndex(
  { provider: 1, providerAccountId: 1 },
  { unique: true }
)
db.verificationtokens.createIndex(
  { identifier: 1, token: 1 },
  { unique: true }
)
```

`usersuggestions`: `userId` ya es único en el schema → suele bastar con el índice único en `userId`.

### Notas

- Si un `createIndex` falla por **índice duplicado** o **mismo nombre**, el índice equivalente ya existe; comparar con `getIndexes()`.
- En **desarrollo** (`yarn dev`), Mongoose a veces crea índices con `autoIndex`; no confiar en eso para producción.
- Nuevos desarrollos: ver regla del proyecto `.cursor/rules/mongodb-indexes.mdc`.