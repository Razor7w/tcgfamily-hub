# Playthrough: torneo online con 8 jugadores

Prueba local del flujo **chat + reporte mutuo** en 4 mesas simultáneas (`tournamentMode: online`).

> **Alcance:** ronda 1 (aleatoria) + **ronda 2+ Swiss** (Play!/TOM: grupos por puntos, float, sin rematches). Ver `docs/swiss-pairing-online.md`.

## Requisitos

- MongoDB (`MONGODB_URI` en `.env.local`)
- Tienda activa (`npx tsx --env-file=.env.local app/scripts/bootstrap-multitenancy.ts` si hace falta)
- Navegador con soporte para **varias sesiones** (perfiles de Chrome, Firefox + Chrome, o ventanas incógnito — máx. ~3 incógnitos en paralelo en Chrome)

## 1. Crear el torneo de prueba

```bash
yarn seed:online-8p
```

Equivalente:

```bash
npx tsx --env-file=.env.local app/scripts/seed-online-tournament-8p.ts
```

El script:

- Crea **8 usuarios dev** si no existen (`dev-online-01@tcgfamily.local` … `08`)
- Password común: `DevOnline8p!` (o `ONLINE_8P_DEV_PASSWORD` en `.env.local`)
- POP IDs: `90000001` … `90000008`
- Torneo `[DEV] Torneo online — 8 jugadores`, `running`, **ronda 1**, **4 mesas**
- Imprime matriz de mesas y `eventId`

### Usar cuentas reales en vez de dev

Si ya tenés 8 usuarios con POP en la BD:

```env
ONLINE_8P_USE_EXISTING=1
```

Luego `yarn seed:online-8p` (toma los 8 primeros por `createdAt`).

## 2. Arrancar la app

```bash
yarn dev
```

Abrí `http://localhost:3000` y elegí la tienda activa (TCGFamily / primaria).

## 3. Lanzar ronda 1 (staff)

Si el torneo está **Programado** sin rondas:

1. **Asistencia** → confirmar quiénes asistieron (solo **confirmados** entran al torneo)
2. **Mesas online** → botón **Lanzar ronda 1** (emparejamiento al azar entre confirmados; bye si hay cantidad impar)
3. El torneo pasa a **En curso**; arranca el **temporizador** de la ronda (minutos configurados al crear el torneo online)
4. Los jugadores confirmados ven mesa, timer y chat en dashboard

*(El seed `[DEV]` puede crear el evento ya con ronda 1; en torneos nuevos el staff lanza la primera ronda desde aquí.)*

## 4. Matriz de mesas (ronda 1)

| Mesa | Jugador A | Jugador B | Email A | Email B |
|------|-----------|-----------|---------|---------|
| 1 | Dev Online 01 | Dev Online 02 | `dev-online-01@tcgfamily.local` | `dev-online-02@tcgfamily.local` |
| 2 | Dev Online 03 | Dev Online 04 | `dev-online-03@tcgfamily.local` | `dev-online-04@tcgfamily.local` |
| 3 | Dev Online 05 | Dev Online 06 | `dev-online-05@tcgfamily.local` | `dev-online-06@tcgfamily.local` |
| 4 | Dev Online 07 | Dev Online 08 | `dev-online-07@tcgfamily.local` | `dev-online-08@tcgfamily.local` |

*(Los nombres exactos los imprime el seed en consola.)*

## 5. Estrategia de prueba en paralelo

No hace falta abrir las 8 sesiones a la vez. Mínimo recomendado:

| Grupo | Sesiones | Qué validás |
|-------|----------|-------------|
| **A** | Mesa 1 (2 navegadores) | Chat en vivo + reporte coincidente |
| **B** | Mesa 2 (2 navegadores) | Solo uno reporta → auto-confirmación **15 s** |
| **C** | Mesa 3 (2 navegadores) | Reporte en conflicto → staff resuelve |
| **D** | Mesa 4 (2 navegadores) | Smoke test rápido |

### Por cada mesa (jugadores emparejados)

1. Login con las dos cuentas de la mesa (perfiles distintos).
2. **Dashboard → Eventos** → semana del torneo `[DEV] Torneo online — 8 jugadores`.
3. Chip **Online** visible.
4. Bloque **Emparejamiento** → panel **Chat de mesa N** (N = número de mesa del jugador).
5. Ambos deben ver **Reporte de partida** con dos botones **Ganó [nombre]**.
6. Chat: enviar nick / acuerdo de partida; el rival lo ve en ~3 s (SSE o polling).

### Escenario A — acuerdo inmediato (mesa 1)

1. J01 pulsa **Ganó Dev Online 01**.
2. J02 pulsa **Ganó Dev Online 01** (mismo ganador).
3. Esperado: *Resultado confirmado*, mensaje de sistema en chat, W/L en torneo.

### Escenario B — timer 15 s (mesa 2)

1. Solo J03 reporta ganador.
2. J04 **sigue viendo los botones** y el texto *Tu rival ya reportó. Tenés 0:XX…*.
3. Opciones:
   - J04 reporta el mismo ganador antes del timer → confirmación mutua.
   - J04 no reporta → a los 15 s se confirma solo el reporte de J03.

### Escenario C — conflicto + staff (mesa 3)

1. J05 reporta **Ganó Dev Online 05**.
2. J06 reporta **Ganó Dev Online 06** (distinto).
3. Ambos ven conflicto; **no pueden** cambiar el reporte.
4. Login con cuenta **staff** (admin de tienda).
5. Ir a **Admin → Eventos → [torneo] → pestaña «Mesas online»** (`/admin/eventos/<eventId>`).
6. El encabezado muestra chip rojo con cantidad de conflictos; el selector de **Ronda** indica en cuál hay conflicto.
7. Elegir **mesa 3** en la lista → panel derecho: **chat** + **Asignar resultado (staff)** con botones «Ganó …» (vale aunque no haya reporte de jugadores).
8. Esperado: resultado registrado + mensaje *Resultado resuelto por staff…* en el chat de la mesa.

### Escenario D — smoke (mesa 4)

1. Un mensaje en chat.
2. Reporte mutuo cualquiera.
3. Cerrar sesión.

## 6. Ver emparejamientos completos

- En el evento: **Ver emparejamientos de la ronda** (diálogo con todas las mesas).
- O detalle: `/dashboard/torneos-semana/<eventId>`.

## 7. API rápida (opcional)

```bash
EVENT_ID="<id del seed>"

# Contexto chat (mesa del jugador logueado)
curl -s "http://localhost:3000/api/events/$EVENT_ID/match-chat?context=1" \
  -H "Cookie: ..." | jq

# Estado reporte mesa 2
curl -s "http://localhost:3000/api/events/$EVENT_ID/online-table-report?roundNum=1&tableNumber=2" \
  -H "Cookie: ..." | jq
```

## 8. Casos negativos

| Caso | Resultado esperado |
|------|-------------------|
| Jugador de mesa 1 abre chat de mesa 2 | 403 / sin acceso |
| Tercer usuario (no inscrito) | Sin emparejamiento / sin chat |
| Torneo presencial | Sin panel chat ni reporte |

## 9. Limpiar

```javascript
use tcgfamily-hub
db.weeklyevents.deleteMany({ title: '[DEV] Torneo online — 8 jugadores' })
db.matchchatmessages.deleteMany({ /* filtrar por eventId si querés */ })
db.onlinetablematchreports.deleteMany({ /* idem */ })
```

Usuarios dev (opcional):

```javascript
db.users.deleteMany({ email: /@tcgfamily\.local$/ })
```

## 10. Lanzar ronda 2 (staff)

Cuando las **4 mesas** de ronda 1 están **Confirmado**:

1. **Admin → Eventos → [torneo] → Mesas online**
2. Banner: `Ronda 1: 4/4 mesas confirmadas`
3. Botón **Lanzar ronda 2** habilitado
4. Clic → emparejamiento **Swiss** (grupos por puntos 3/1/0, float entre brackets, sin rematches; bye máx. 1 por jugador)
5. Jugadores ven nueva ronda en **Dashboard → Eventos**

## 11. Finalizar torneo (staff)

Cuando la **última ronda** tiene todas las mesas **Confirmado** (y no querés publicar otra):

1. **Admin → Eventos → [torneo] → Mesas online**
2. Banner: `Ronda N: X/X mesas confirmadas`
3. Botón **Finalizar torneo** habilitado (junto a «Lanzar ronda N+1» si aún no hay siguiente ronda publicada)
4. Confirmar en el diálogo → `state: close`, `tournamentStandings` (Swiss + OWP/OOWP), puntos de participación
5. En admin ya no se muestra chat por mesa; solo resumen del resultado
6. Jugadores ven torneo **Cerrado** en dashboard y clasificación final
7. Staff revisa el mismo standing al final de **Resultados TDF** (tabla por categoría, W/L/T, OWP/OOWP)

## Índices MongoDB

Sin índices nuevos para este playthrough. Si aún no los creaste para chat/reporte:

```javascript
db.matchchatmessages.createIndex(
  { eventId: 1, roundNum: 1, tableNumber: 1, createdAt: 1 }
)
db.matchchatmessages.createIndex(
  { eventId: 1, roundNum: 1, tableNumber: 1, _id: 1 }
)
db.onlinetablematchreports.createIndex(
  { eventId: 1, roundNum: 1, tableNumber: 1 },
  { unique: true }
)
```
