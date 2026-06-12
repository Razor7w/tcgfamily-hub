import type { PipelineStage, Types } from 'mongoose'
import WeeklyEvent from '@/models/WeeklyEvent'

export type WeeklyEventUserReportQueryOptions = {
  sort: Record<string, 1 | -1>
  limit?: number
  /** Incluye `$lookup` a `stores` (name, slug) como en my-home-tournaments. */
  lookupStore?: boolean
}

/** Campos de evento + participantes; `matchRounds` solo del usuario indicado. */
function userReportProjectStage(userOid: Types.ObjectId): PipelineStage {
  const project: Record<string, unknown> = {
    startsAt: 1,
    title: 1,
    kind: 1,
    game: 1,
    state: 1,
    tournamentOrigin: 1,
    tournamentStandings: 1,
    storeId: 1,
    participants: {
      $map: {
        input: { $ifNull: ['$participants', []] },
        as: 'p',
        in: {
          displayName: '$$p.displayName',
          userId: '$$p.userId',
          popId: '$$p.popId',
          wins: '$$p.wins',
          losses: '$$p.losses',
          ties: '$$p.ties',
          deckPokemonSlugs: '$$p.deckPokemonSlugs',
          manualPlacement: '$$p.manualPlacement',
          matchRounds: {
            $cond: [
              { $eq: ['$$p.userId', userOid] },
              '$$p.matchRounds',
              '$$REMOVE'
            ]
          }
        }
      }
    }
  }
  return { $project: project }
}

/**
 * Listados «mis torneos»: evita traer `matchRounds` de otros participantes
 * (reduce bytes Mongo y CPU al serializar).
 */
export async function aggregateWeeklyEventsForUserReport(
  filter: Record<string, unknown>,
  userOid: Types.ObjectId,
  options: WeeklyEventUserReportQueryOptions
): Promise<Record<string, unknown>[]> {
  const pipeline: PipelineStage[] = [
    { $match: filter },
    { $sort: options.sort }
  ]
  if (typeof options.limit === 'number' && options.limit > 0) {
    pipeline.push({ $limit: options.limit })
  }
  if (options.lookupStore) {
    pipeline.push(
      {
        $lookup: {
          from: 'stores',
          localField: 'storeId',
          foreignField: '_id',
          as: '_storeLookup',
          pipeline: [{ $project: { name: 1, slug: 1 } }]
        }
      },
      {
        $addFields: {
          storeId: { $arrayElemAt: ['$_storeLookup', 0] }
        }
      },
      { $project: { _storeLookup: 0 } }
    )
  }
  pipeline.push(userReportProjectStage(userOid))
  return WeeklyEvent.aggregate(pipeline).exec()
}
