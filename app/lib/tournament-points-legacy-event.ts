import mongoose from 'mongoose'
import WeeklyEvent, { type IWeeklyEvent } from '@/models/WeeklyEvent'
import { parseExpiryDate } from '@/lib/store-points-csv'
import { legacyEventStorageTitle } from '@/lib/tournament-points-legacy-label'

export {
  LEGACY_IMPORT_EVENT_TITLE_PREFIX,
  displayTitleFromLegacyEvent,
  legacyEventStorageTitle,
  legacyImportGroupKey,
  normalizeLegacyTournamentLabel
} from '@/lib/tournament-points-legacy-label'

export function parseLegacyEventDate(
  raw: string | undefined
): Date | undefined {
  if (!raw?.trim()) return undefined
  return parseExpiryDate(raw)
}

/**
 * @deprecated Las importaciones CSV ya no crean WeeklyEvent; usan
 * `importGroupKey` en `TournamentPointsAward`. Se mantiene por si hay datos legacy.
 */
export async function findOrCreateLegacyImportEvent(
  storeOid: mongoose.Types.ObjectId,
  label: string,
  startsAt?: Date
): Promise<IWeeklyEvent> {
  const storageTitle = legacyEventStorageTitle(label)
  const existing = await WeeklyEvent.findOne({
    storeId: storeOid,
    title: storageTitle,
    tournamentOrigin: 'official',
    state: 'close'
  }).exec()

  if (existing) {
    if (startsAt && existing.startsAt?.getTime() !== startsAt.getTime()) {
      existing.startsAt = startsAt
      await existing.save()
    }
    return existing
  }

  const when =
    startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt : new Date()

  return WeeklyEvent.create({
    storeId: storeOid,
    title: storageTitle,
    startsAt: when,
    kind: 'tournament',
    game: 'pokemon',
    tournamentOrigin: 'official',
    state: 'close',
    priceClp: 0,
    maxParticipants: 999,
    formatNotes: 'Torneo generado por importación CSV de puntos históricos.',
    prizesNotes: '',
    location: '',
    participants: [],
    roundNum: 0
  })
}
