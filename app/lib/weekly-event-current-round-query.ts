import mongoose from 'mongoose'
import WeeklyEvent from '@/models/WeeklyEvent'
import type { IRoundSnapshot } from '@/models/WeeklyEvent'

/**
 * Una ronda de `roundSnapshots` sin serializar el array completo al runtime Node.
 */
export async function loadWeeklyEventRoundSnapshot(
  eventId: string,
  roundNum: number
): Promise<IRoundSnapshot | null> {
  if (!mongoose.Types.ObjectId.isValid(eventId.trim())) return null
  const targetRound = Math.round(Number(roundNum) || 0)
  if (!Number.isFinite(targetRound)) return null

  const rows = await WeeklyEvent.aggregate<{ snap: IRoundSnapshot | null }>([
    { $match: { _id: new mongoose.Types.ObjectId(eventId.trim()) } },
    {
      $project: {
        snap: {
          $arrayElemAt: [
            {
              $filter: {
                input: { $ifNull: ['$roundSnapshots', []] },
                as: 's',
                cond: {
                  $eq: [
                    { $round: { $ifNull: ['$$s.roundNum', -1] } },
                    targetRound
                  ]
                }
              }
            },
            0
          ]
        }
      }
    }
  ])

  return rows[0]?.snap ?? null
}
