/**
 * Seed idempotente: torneo online con 8 jugadores y ronda 1 (4 mesas).
 *
 * Uso:
 *   npx tsx --env-file=.env.local app/scripts/seed-online-tournament-8p.ts
 *
 * Opcional en .env.local:
 *   ONLINE_8P_DEV_PASSWORD=DevOnline8p!
 *   ONLINE_8P_USE_EXISTING=1   — no crea usuarios; usa los 8 primeros con POP en BD
 *
 * Crea (si hace falta) dev-online-01@tcgfamily.local … 08 con POP 90000001–90000008.
 */

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import User from '@/models/User'
import WeeklyEvent from '@/models/WeeklyEvent'
import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'
import { popidForStorage } from '@/lib/rut-chile'
import { hashPassword } from '@/lib/password-server'
import type { IRoundPairingSnapshot } from '@/models/WeeklyEvent'

const SEED_TITLE = '[DEV] Torneo online — 8 jugadores'
const PLAYER_COUNT = 8
const DEV_EMAIL_DOMAIN = 'tcgfamily.local'
const DEV_POP_BASE = 90_000_001

type SeedUser = {
  _id: mongoose.Types.ObjectId
  email: string
  name: string
  popid: string
}

function devEmail(n: number): string {
  return `dev-online-${String(n).padStart(2, '0')}@${DEV_EMAIL_DOMAIN}`
}

function devPop(n: number): string {
  return String(DEV_POP_BASE + n - 1)
}

function devName(n: number): string {
  return `Dev Online ${String(n).padStart(2, '0')}`
}

async function ensureDevUsers(password: string): Promise<SeedUser[]> {
  const users: SeedUser[] = []

  for (let i = 1; i <= PLAYER_COUNT; i++) {
    const email = devEmail(i)
    const popid = devPop(i)
    const name = devName(i)

    let doc = await User.findOne({ email })
      .collation({ locale: 'en', strength: 2 })
      .select('_id email name popid')

    if (!doc) {
      const passwordHash = await hashPassword(password)
      doc = await User.create({
        email,
        name,
        popid,
        passwordHash,
        role: 'user',
        mustChangePassword: false
      })
      console.info(`   + Usuario creado: ${email} (POP ${popid})`)
    } else {
      let changed = false
      if (!doc.popid?.trim()) {
        doc.popid = popid
        changed = true
      }
      if (!doc.name?.trim()) {
        doc.name = name
        changed = true
      }
      const withHash = await User.findById(doc._id).select('+passwordHash')
      if (!withHash?.passwordHash) {
        doc.passwordHash = await hashPassword(password)
        changed = true
      }
      if (changed) await doc.save()
      console.info(
        `   · Usuario existente: ${email} (POP ${doc.popid || popid})`
      )
    }

    users.push({
      _id: doc._id as mongoose.Types.ObjectId,
      email,
      name: typeof doc.name === 'string' && doc.name.trim() ? doc.name : name,
      popid: popidForStorage(String(doc.popid ?? popid))
    })
  }

  return users
}

async function loadExistingUsers(): Promise<SeedUser[]> {
  const rows = await User.find({ popid: { $exists: true, $nin: ['', null] } })
    .sort({ createdAt: 1 })
    .limit(PLAYER_COUNT)
    .select('_id email name popid')
    .lean<
      {
        _id: mongoose.Types.ObjectId
        email?: string
        name?: string
        popid?: string
      }[]
    >()

  if (rows.length < PLAYER_COUNT) {
    throw new Error(
      `ONLINE_8P_USE_EXISTING=1 pero solo hay ${rows.length} usuario(s) con POP. Necesitás ${PLAYER_COUNT}.`
    )
  }

  return rows.map((r, idx) => ({
    _id: r._id,
    email: r.email ?? `usuario-${idx + 1}`,
    name:
      typeof r.name === 'string' && r.name.trim()
        ? r.name.trim()
        : `Jugador ${idx + 1}`,
    popid: popidForStorage(String(r.popid ?? ''))
  }))
}

function buildRound1Pairings(users: SeedUser[]): IRoundPairingSnapshot[] {
  const pairings: IRoundPairingSnapshot[] = []
  for (let t = 0; t < users.length / 2; t++) {
    const a = users[t * 2]
    const b = users[t * 2 + 1]
    const tableNumber = String(t + 1)
    pairings.push({
      tableNumber,
      player1PopId: a.popid,
      player2PopId: b.popid,
      player1Name: a.name,
      player2Name: b.name,
      player1Record: { wins: 0, losses: 0, ties: 0 },
      player2Record: { wins: 0, losses: 0, ties: 0 },
      isBye: false
    })
  }
  return pairings
}

function applyTableFields(
  participants: {
    popId?: string
    table?: string
    opponentId?: string
  }[],
  pairings: IRoundPairingSnapshot[]
) {
  const findByPop = (pop: string) =>
    participants.find(
      p => popidForStorage(typeof p.popId === 'string' ? p.popId : '') === pop
    )

  for (const row of pairings) {
    const p1 = findByPop(row.player1PopId)
    const p2 = findByPop(row.player2PopId)
    if (p1 && p2) {
      p1.table = row.tableNumber
      p1.opponentId = row.player2PopId
      p2.table = row.tableNumber
      p2.opponentId = row.player1PopId
    }
  }
}

async function main() {
  await connectDB()
  console.info('🔗 MongoDB conectado')

  const password = process.env.ONLINE_8P_DEV_PASSWORD?.trim() || 'DevOnline8p!'
  const useExisting = process.env.ONLINE_8P_USE_EXISTING === '1'

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

  console.info('')
  console.info('── Jugadores ──')
  const users = useExisting
    ? await loadExistingUsers()
    : await ensureDevUsers(password)

  for (const u of users) {
    if (!u.popid) {
      throw new Error(`Usuario ${u.email} sin POP ID válido`)
    }
  }

  const pairings = buildRound1Pairings(users)
  const now = new Date()

  await WeeklyEvent.deleteMany({ title: SEED_TITLE, storeId })

  const participants = users.map(u => ({
    displayName: u.name,
    userId: u._id,
    createdAt: now,
    confirmed: true,
    popId: u.popid,
    table: '',
    opponentId: '',
    wins: 0,
    losses: 0,
    ties: 0
  }))

  applyTableFields(participants, pairings)

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
    formatNotes: 'Seed local — 8 jugadores, 4 mesas, ronda 1.',
    prizesNotes: '',
    location: 'Online (PTCG Live)',
    state: 'running',
    roundNum: 1,
    participants,
    roundSnapshots: [
      {
        roundNum: 1,
        syncedAt: now,
        pairings,
        skipped: []
      }
    ]
  })

  const eventId = String(doc._id)
  const baseUrl =
    process.env.AUTH_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

  console.info('')
  console.info('✅ Torneo online 8p creado')
  console.info(`   ID:      ${eventId}`)
  console.info(`   Título:  ${SEED_TITLE}`)
  console.info(`   Estado:  running · Ronda 1 · ${pairings.length} mesas`)
  if (!useExisting) {
    console.info(`   Password (todos): ${password}`)
  }
  console.info('')
  console.info('── Mesas ronda 1 ──')
  for (const p of pairings) {
    console.info(
      `   Mesa ${p.tableNumber}: ${p.player1Name} (${p.player1PopId}) vs ${p.player2Name} (${p.player2PopId})`
    )
  }
  console.info('')
  console.info('── Cuentas ──')
  for (const u of users) {
    console.info(`   ${u.email}  POP ${u.popid}`)
  }
  console.info('')
  console.info('── URLs ──')
  console.info(`   Eventos:  ${baseUrl}/dashboard/eventos`)
  console.info(`   Detalle:  ${baseUrl}/dashboard/torneos-semana/${eventId}`)
  console.info(`   Playthrough: docs/playthrough-online-tournament-8p.md`)
  console.info('')
  console.info('Limpiar:')
  console.info(`   db.weeklyevents.deleteMany({ title: "${SEED_TITLE}" })`)
  console.info('')

  await mongoose.disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
