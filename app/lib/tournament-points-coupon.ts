import 'server-only'

import { randomBytes } from 'crypto'
import mongoose from 'mongoose'
import {
  isTournamentPointsRedeemStep,
  normalizeStorePointsAmount
} from '@/lib/store-points-amount'
import { popidForStorage } from '@/lib/rut-chile'
import { deductTournamentPointsForPlayer } from '@/lib/tournament-points-admin'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'
import {
  TOURNAMENT_POINTS_COUPON_REASON_MAX,
  TOURNAMENT_POINTS_COUPON_REASON_MIN,
  TOURNAMENT_POINTS_COUPON_TTL_MS
} from '@/lib/tournament-points-coupon-constants'
import TournamentPointsAward, {
  type ITournamentPointsAward
} from '@/models/TournamentPointsAward'
import TournamentPointsCoupon from '@/models/TournamentPointsCoupon'
import User from '@/models/User'

export {
  TOURNAMENT_POINTS_COUPON_REASON_MAX,
  TOURNAMENT_POINTS_COUPON_REASON_MIN,
  TOURNAMENT_POINTS_COUPON_TTL_MS
} from '@/lib/tournament-points-coupon-constants'

export type TournamentPointsCouponDTO = {
  id: string
  code: string
  points: number
  reason: string
  createdAt: string
  expiresAt: string
  validForHours: 24
}

function generateCouponCode(): string {
  const day = new Date()
  const y = day.getFullYear().toString().slice(-2)
  const m = String(day.getMonth() + 1).padStart(2, '0')
  const d = String(day.getDate()).padStart(2, '0')
  const rand = randomBytes(3).toString('hex').toUpperCase()
  return `CNJ-${y}${m}${d}-${rand}`
}

export async function getUserTournamentPointsBalance(input: {
  storeOid: mongoose.Types.ObjectId
  userId: string
}): Promise<{ totalPoints: number; primaryPopId: string }> {
  const user = await User.findById(input.userId).select('popid').lean<{
    popid?: string
  } | null>()
  const primaryPopId = popidForStorage(user?.popid ?? '')
  const userOid = new mongoose.Types.ObjectId(input.userId)

  const awards = (await TournamentPointsAward.find({
    storeId: input.storeOid
  })
    .select('rows')
    .lean()) as unknown as Pick<ITournamentPointsAward, 'rows'>[]

  let totalPoints = 0
  for (const award of awards) {
    for (const row of award.rows ?? []) {
      const rowPop = popidForStorage(row.popId)
      const rowUser =
        row.userId instanceof mongoose.Types.ObjectId
          ? row.userId.equals(userOid)
          : row.userId != null && String(row.userId) === input.userId
      if (!rowUser && (!primaryPopId || rowPop !== primaryPopId)) continue
      totalPoints = normalizeStorePointsAmount(
        totalPoints + normalizeStorePointsAmount(row.points)
      )
    }
  }

  return { totalPoints, primaryPopId }
}

export async function createTournamentPointsCouponForUser(input: {
  storeOid: mongoose.Types.ObjectId
  userId: string
  points: number
  reason: string
  userDisplayName: string
}): Promise<TournamentPointsCouponDTO> {
  const points = normalizeStorePointsAmount(input.points)
  if (!isTournamentPointsRedeemStep(points)) {
    throw new Error(
      'Solo puedes canjear múltiplos de 0.5 puntos (por ejemplo 0.5, 1, 1.5).'
    )
  }

  const reason = input.reason
    .trim()
    .slice(0, TOURNAMENT_POINTS_COUPON_REASON_MAX)
  if (reason.length < TOURNAMENT_POINTS_COUPON_REASON_MIN) {
    throw new Error(
      `La razón debe tener al menos ${TOURNAMENT_POINTS_COUPON_REASON_MIN} caracteres`
    )
  }

  const { totalPoints, primaryPopId } = await getUserTournamentPointsBalance({
    storeOid: input.storeOid,
    userId: input.userId
  })
  if (points > totalPoints) {
    throw new Error(
      `No tienes saldo suficiente. Disponible: ${totalPoints} pts.`
    )
  }
  if (!primaryPopId) {
    // Deducción por userId sigue funcionando si las filas tienen userId
  }

  const primaryStoreOid = await memoPrimaryTcgfamilyStoreObjectId()
  const userOid = new mongoose.Types.ObjectId(input.userId)

  const deduct = await deductTournamentPointsForPlayer({
    storeOid: input.storeOid,
    primaryStoreOid: primaryStoreOid ?? null,
    userId: input.userId,
    primaryPopId: primaryPopId || 'unknown',
    subtract: points,
    reason: `Cupón de canje: ${reason}`,
    changedByUserId: userOid,
    changedByName: input.userDisplayName || 'Jugador'
  })

  if (!deduct.changed) {
    throw new Error('No se pudo descontar el saldo. Intenta de nuevo.')
  }

  const createdAt = new Date()
  const expiresAt = new Date(
    createdAt.getTime() + TOURNAMENT_POINTS_COUPON_TTL_MS
  )

  let saved: {
    _id: mongoose.Types.ObjectId
    code: string
    points: number
    reason: string
    createdAt: Date
    expiresAt: Date
  } | null = null

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const doc = await TournamentPointsCoupon.create({
        storeId: input.storeOid,
        userId: userOid,
        code: generateCouponCode(),
        points,
        reason,
        expiresAt
      })
      saved = {
        _id: doc._id as mongoose.Types.ObjectId,
        code: doc.code,
        points: doc.points,
        reason: doc.reason,
        createdAt: (doc as { createdAt?: Date }).createdAt ?? createdAt,
        expiresAt: doc.expiresAt
      }
      break
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e
          ? (e as { code?: number }).code
          : undefined
      if (code === 11000) continue
      throw e
    }
  }

  if (!saved) {
    throw new Error('No se pudo generar el código del cupón')
  }

  return {
    id: saved._id.toString(),
    code: saved.code,
    points: normalizeStorePointsAmount(saved.points),
    reason: saved.reason,
    createdAt: saved.createdAt.toISOString(),
    expiresAt: saved.expiresAt.toISOString(),
    validForHours: 24
  }
}
