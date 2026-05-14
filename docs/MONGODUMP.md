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
