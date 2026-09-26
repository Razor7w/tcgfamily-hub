import type { Types } from 'mongoose'
import CardPhoto from '@/models/CardPhoto'
import CardSingle from '@/models/CardSingle'

export type BinderItemCounts = { total: number; published: number }

/** Suma singles + fotos por carpeta (total y publicados). */
export async function binderItemCountsByUser(
  userOid: Types.ObjectId
): Promise<Map<string, BinderItemCounts>> {
  const [singleCounts, photoCounts] = await Promise.all([
    CardSingle.aggregate<{
      _id: Types.ObjectId
      total: number
      published: number
    }>([
      { $match: { userId: userOid } },
      {
        $group: {
          _id: '$binderId',
          total: { $sum: 1 },
          published: { $sum: { $cond: ['$published', 1, 0] } }
        }
      }
    ]),
    CardPhoto.aggregate<{
      _id: Types.ObjectId
      total: number
      published: number
    }>([
      { $match: { userId: userOid } },
      {
        $group: {
          _id: '$binderId',
          total: { $sum: 1 },
          published: { $sum: { $cond: ['$published', 1, 0] } }
        }
      }
    ])
  ])

  const map = new Map<string, BinderItemCounts>()
  for (const c of singleCounts) {
    map.set(c._id.toString(), { total: c.total, published: c.published })
  }
  for (const c of photoCounts) {
    const key = c._id.toString()
    const prev = map.get(key) ?? { total: 0, published: 0 }
    map.set(key, {
      total: prev.total + c.total,
      published: prev.published + c.published
    })
  }
  return map
}

export async function binderPublishedCountsByUser(
  userOid: Types.ObjectId
): Promise<Map<string, number>> {
  const map = await binderItemCountsByUser(userOid)
  const published = new Map<string, number>()
  for (const [id, c] of map) {
    if (c.published > 0) published.set(id, c.published)
  }
  return published
}
