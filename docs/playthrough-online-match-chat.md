# Playthrough: chat de mesa en torneo online

Prueba local del chat (SSE + polling) en torneos con `tournamentMode: online`.

## Requisitos

- MongoDB accesible (`MONGODB_URI` en `.env.local`)
- Al menos **2 usuarios** con **POP ID** y contraseña (o Google)
- Tienda primaria configurada (`bootstrap-multitenancy` si hace falta)

## 1. Crear datos de prueba

```bash
npx tsx --env-file=.env.local app/scripts/seed-online-tournament-chat.ts
```

Opcional — fijar jugadores:

```env
CHAT_TEST_USER1_EMAIL=jugador1@ejemplo.com
CHAT_TEST_USER2_EMAIL=jugador2@ejemplo.com
```

El script imprime `eventId`, emails y URLs.

## 2. Arrancar la app

```bash
yarn dev
```

## 3. Jugador 1

1. Login en `http://localhost:3000`
2. Selecciona tienda activa (misma del evento seed)
3. Ve a **Dashboard → Eventos** (`/dashboard/eventos`)
4. Semana del torneo `[DEV] Torneo online — prueba chat`
5. Verifica chips **Online** y bloque **Emparejamiento**
6. Panel **Chat de mesa 1** visible (solo torneos online + `running`)
7. Escribe: `Mi nick: TestPlayer1`

## 4. Jugador 2

1. Ventana incógnito, login con el segundo usuario
2. Mismo evento → mismo chat
3. El mensaje de J1 aparece (SSE «En vivo» o polling ~3 s)
4. Responde: `Ok, soy TestPlayer2`

## 5. Reporte mutuo de resultado

En el panel **Chat de mesa** aparece la barra **Reporte de partida** (solo online). Cada jugador elige **quién ganó** (nombre de uno de los dos).

1. **J1** pulsa **Ganó [nombre]**
2. **J2** pulsa el **mismo ganador**
3. Si coinciden → **Resultado confirmado** + mensaje de sistema en el chat + W/L en el torneo
4. Si solo uno reporta → tras **15 s** se confirma solo
5. Si reportan ganadores distintos → **conflicto**; los jugadores no pueden cambiar el reporte hasta que el **staff** abra esa mesa y elija el ganador (PATCH)

API (opcional):

```bash
curl -s "http://localhost:3000/api/events/$EVENT_ID/online-table-report?roundNum=1&tableNumber=1" \
  -H "Cookie: ..." | jq

curl -s -X POST "http://localhost:3000/api/events/$EVENT_ID/online-table-report" \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{"roundNum":1,"tableNumber":"1","winnerPopId":"<pop del ganador>"}' | jq

# Staff — resolver conflicto
curl -s -X PATCH "http://localhost:3000/api/events/$EVENT_ID/online-table-report" \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{"roundNum":1,"tableNumber":"1","winnerPopId":"<pop del ganador>"}' | jq
```

## 6. Comprobar API chat (opcional)

Con sesión activa (DevTools → copiar cookie):

```bash
EVENT_ID="<id del seed>"

curl -s "http://localhost:3000/api/events/$EVENT_ID/match-chat?context=1" \
  -H "Cookie: ..." | jq

curl -s -X POST "http://localhost:3000/api/events/$EVENT_ID/match-chat" \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{"roundNum":1,"tableNumber":"1","message":"desde curl"}' | jq
```

## 7. Casos negativos

| Caso | Resultado esperado |
|------|-------------------|
| Torneo **presencial** (`in_person`) | Sin panel chat |
| Torneo online pero `schedule` | Contexto `canChat: false` |
| Usuario no emparejado en la mesa | 403 al POST |
| Mesa con bye | Sin chat |

Cambia modalidad en **Admin → Eventos → Modalidad**.

## 8. Limpiar

```javascript
use tcgfamily-hub
db.weeklyevents.deleteMany({ title: '[DEV] Torneo online — prueba chat' })
db.matchchatmessages.deleteMany({ /* opcional por eventId */ })
db.onlinetablematchreports.deleteMany({ /* opcional por eventId */ })
```

## Índices MongoDB

Si aún no existen:

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
