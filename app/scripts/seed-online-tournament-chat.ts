/**
 * Seed idempotente: torneo online en curso con emparejamiento R1 para probar chat.
 *
 * Uso:
 *   npx tsx --env-file=.env.local app/scripts/seed-online-tournament-chat.ts
 *
 * Opcional en .env.local:
 *   CHAT_TEST_USER1_EMAIL=jugador1@ejemplo.com
 *   CHAT_TEST_USER2_EMAIL=jugador2@ejemplo.com
 *
 * Si no se definen, usa los dos primeros usuarios con POP ID en BD.
 */

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import User from '@/models/User'
import WeeklyEvent from '@/models/WeeklyEvent'
import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'
import { popidForStorage } from '@/lib/rut-chile'

const SEED_TITLE = '[DEV] Torneo online — prueba chat'
const TABLE_NUMBER = '1'

type SeedUserLean = {
  _id: mongoose.Types.ObjectId
  email?: string
  name?: string
  popid?: string
}

async function resolveUser(
  emailEnv: string | undefined,
  label: string
): Promise<SeedUserLean | null> {
  if (emailEnv?.trim()) {
    const u = await User.findOne({ email: emailEnv.trim().toLowerCase() })
      .collation({ locale: 'en', strength: 2 })
      .select('_id email name popid')
      .lean<SeedUserLean>()
    if (!u) {
      throw new Error(
        `No se encontró usuario ${label} (${emailEnv}). Créalo o ajusta CHAT_TEST_USER*_EMAIL.`
      )
    }
    return u
  }
  return null
}

async function main() {
  await connectDB()
  console.info('🔗 MongoDB conectado')

  const store =
    (await Store.findOne({ slug: DEFAULT_PRIMARY_STORE_SLUG }).select('_id')) ??
    (await Store.findOne({ isActive: true })
      .sort({ createdAt: 1 })
      .select('_id'))
  if (!store?._id) {
    throw new Error(
      'No hay tienda activa. Ejecuta bootstrap-multitenancy primero.'
    )
  }
  const storeId = store._id as mongoose.Types.ObjectId

  const u1: SeedUserLean | null =
    (await resolveUser(process.env.CHAT_TEST_USER1_EMAIL, 'CHAT_TEST_USER1')) ??
    (await User.findOne({ popid: { $exists: true, $nin: ['', null] } })
      .sort({ createdAt: 1 })
      .select('_id email name popid')
      .lean<SeedUserLean>())

  const u2Resolved = await resolveUser(
    process.env.CHAT_TEST_USER2_EMAIL,
    'CHAT_TEST_USER2'
  )
  const u2: SeedUserLean | null =
    u2Resolved ??
    (u1
      ? await User.findOne({
          _id: { $ne: u1._id },
          popid: { $exists: true, $nin: ['', null] }
        })
          .sort({ createdAt: 1 })
          .select('_id email name popid')
          .lean<SeedUserLean>()
      : null)

  if (!u1 || !u2) {
    throw new Error(
      'Se necesitan 2 usuarios con POP ID (o define CHAT_TEST_USER1_EMAIL y CHAT_TEST_USER2_EMAIL).'
    )
  }

  const user1Id = u1._id

  const pop1 = popidForStorage(String(u1.popid ?? ''))
  const pop2 = popidForStorage(String(u2.popid ?? ''))
  if (!pop1 || !pop2) {
    throw new Error('Ambos usuarios deben tener POP ID válido.')
  }

  const name1 =
    typeof u1.name === 'string' && u1.name.trim() ? u1.name.trim() : 'Jugador 1'
  const name2 =
    typeof u2.name === 'string' && u2.name.trim() ? u2.name.trim() : 'Jugador 2'

  await WeeklyEvent.deleteMany({ title: SEED_TITLE, storeId })

  const now = new Date()
  const doc = await WeeklyEvent.create({
    storeId,
    startsAt: now,
    title: SEED_TITLE,
    tournamentOrigin: 'official',
    kind: 'tournament',
    game: 'pokemon',
    pokemonSubtype: 'casual',
    tournamentMode: 'online',
    priceClp: 0,
    maxParticipants: 32,
    formatNotes: 'Seed local para probar chat de mesa.',
    prizesNotes: '',
    location: 'Online (PTCG Live)',
    state: 'running',
    roundNum: 1,
    participants: [
      {
        displayName: name1,
        userId: user1Id,
        createdAt: now,
        confirmed: true,
        popId: pop1,
        wins: 0,
        losses: 0,
        ties: 0
      },
      {
        displayName: name2,
        userId: u2._id,
        createdAt: now,
        confirmed: true,
        popId: pop2,
        wins: 0,
        losses: 0,
        ties: 0
      }
    ],
    roundSnapshots: [
      {
        roundNum: 1,
        syncedAt: now,
        pairings: [
          {
            tableNumber: TABLE_NUMBER,
            player1PopId: pop1,
            player2PopId: pop2,
            player1Name: name1,
            player2Name: name2,
            player1Record: { wins: 0, losses: 0, ties: 0 },
            player2Record: { wins: 0, losses: 0, ties: 0 },
            isBye: false
          }
        ],
        skipped: []
      }
    ]
  })

  const eventId = String(doc._id)
  const baseUrl =
    process.env.AUTH_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

  console.info('')
  console.info('✅ Torneo online de prueba creado')
  console.info(`   ID:     ${eventId}`)
  console.info(`   Título: ${SEED_TITLE}`)
  console.info(`   Mesa:   ${TABLE_NUMBER} · Ronda 1`)
  console.info('')
  console.info('── Playthrough manual ──')
  console.info('')
  console.info('1. Arranca la app: yarn dev')
  console.info('2. Inicia sesión como jugador 1:')
  console.info(`      ${u1.email}`)
  console.info('3. Abre el evento (elige tienda activa si aplica):')
  console.info(`      ${baseUrl}/dashboard/eventos`)
  console.info('   → selecciona la semana del torneo y verifica chip «Online»')
  console.info(
    '   → en «Emparejamiento» debe aparecer el panel «Chat de mesa 1»'
  )
  console.info('4. Envía un mensaje de prueba (ej. nick en PTCG Live).')
  console.info('5. En otra ventana incógnito, inicia sesión como jugador 2:')
  console.info(`      ${u2.email}`)
  console.info(
    '6. Abre el mismo evento; el mensaje debe verse en ~3 s (SSE o polling).'
  )
  console.info('')
  console.info('Alternativa detalle torneo:')
  console.info(`   ${baseUrl}/dashboard/torneos-semana/${eventId}`)
  console.info('')
  console.info('API directa (con cookie de sesión):')
  console.info(`   GET  /api/events/${eventId}/match-chat?context=1`)
  console.info(
    `   POST /api/events/${eventId}/match-chat  { "roundNum": 1, "tableNumber": "${TABLE_NUMBER}", "message": "hola" }`
  )
  console.info('')
  console.info('Limpiar seed:')
  console.info(`   db.weeklyevents.deleteOne({ _id: ObjectId("${eventId}") })`)
  console.info('')

  await mongoose.disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
