import mongoose from 'mongoose'
import Mail from '@/models/Mails'
import User from '@/models/User'
import {
  normalizeMailCodeForSearch,
  isMailInStoreWaitingPickup,
  isMailNotReceivedInStore
} from '@/lib/mail-code-search'
import {
  filterFromUserFromRef,
  filterToRecipientFromMail,
  normalizeMailFilterSearchText,
  rutCompareKey,
  type FilterFromUser,
  type FilterToRecipient
} from '@/lib/mail-recipient-filter'
import type { ElapsedBucketFilter } from '@/lib/mail-store-days'

export type MailListStageFilter = 'all' | 'pending' | 'inStore' | 'retired'

export type MailAdminListFilters = {
  stage?: MailListStageFilter
  elapsed?: ElapsedBucketFilter
  fromUserId?: string | null
  /** Varios remitentes (texto libre resuelto en cliente). Vacío = sin resultados. */
  fromUserIds?: string[] | null
  toUserId?: string | null
  /** Varios destinatarios con cuenta. Vacío + sin toRuts = sin resultados. */
  toUserIds?: string[] | null
  toRut?: string | null
  toRuts?: string[] | null
  q?: string | null
  fromQ?: string | null
  toQ?: string | null
}

export const MAIL_LIST_DEFAULT_LIMIT = 20
export const MAIL_LIST_MAX_LIMIT = 100
export const MAIL_LIST_IDS_MAX_LIMIT = 2000

const MAIL_LIST_SELECT =
  'code storeId fromUserId toUserId toRut isRecived isRecivedInStore receivedInStoreAt observations createdAt updatedAt'

const DAY_MS = 24 * 60 * 60 * 1000

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseObjectId(
  raw: string | null | undefined
): mongoose.Types.ObjectId | null {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (!s || !mongoose.Types.ObjectId.isValid(s)) return null
  return new mongoose.Types.ObjectId(s)
}

function parseObjectIds(
  raw: string[] | null | undefined
): mongoose.Types.ObjectId[] {
  if (!raw?.length) return []
  const out: mongoose.Types.ObjectId[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const oid = parseObjectId(item)
    if (!oid) continue
    const key = oid.toString()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(oid)
  }
  return out
}

function toRutDigitsRegex(raw: string): Record<string, unknown> | null {
  const key = rutCompareKey(raw)
  const digits = key.replace(/\D/g, '')
  if (!digits) {
    const t = raw.trim()
    return t ? { toRut: t } : null
  }
  return {
    toRut: {
      $regex: digits.split('').join('[.\\-\\s]?'),
      $options: 'i'
    }
  }
}

function stageMongoFilter(
  stage: MailListStageFilter | undefined
): Record<string, unknown> | null {
  if (!stage || stage === 'all') return null
  if (stage === 'retired') return { isRecived: true }
  if (stage === 'inStore') {
    return { isRecived: false, isRecivedInStore: true }
  }
  if (stage === 'pending') {
    return { isRecived: false, isRecivedInStore: false }
  }
  return null
}

/** Rangos de antigüedad en tienda (misma lógica que `toneForStoreWaitDays`). */
function elapsedMongoFilter(
  elapsed: ElapsedBucketFilter | undefined
): Record<string, unknown> | null {
  if (!elapsed || elapsed === 'all') return null
  const now = Date.now()
  const base = {
    isRecived: false,
    isRecivedInStore: true,
    receivedInStoreAt: { $type: 'date' as const }
  }
  if (elapsed === 'green') {
    return {
      ...base,
      receivedInStoreAt: {
        $gte: new Date(now - 7 * DAY_MS),
        $type: 'date'
      }
    }
  }
  if (elapsed === 'yellow') {
    return {
      ...base,
      receivedInStoreAt: {
        $gte: new Date(now - 14 * DAY_MS),
        $lt: new Date(now - 7 * DAY_MS)
      }
    }
  }
  if (elapsed === 'orange') {
    return {
      ...base,
      receivedInStoreAt: {
        $gte: new Date(now - 30 * DAY_MS),
        $lt: new Date(now - 14 * DAY_MS)
      }
    }
  }
  // red: 31+ días
  return {
    ...base,
    receivedInStoreAt: { $lt: new Date(now - 30 * DAY_MS) }
  }
}

/** Fallback API: solo si no vienen IDs pre-resueltos. Exige ≥2 chars. */
async function userIdsMatchingParticipantQuery(
  query: string
): Promise<mongoose.Types.ObjectId[]> {
  const v = normalizeMailFilterSearchText(query)
  if (v.length < 2) return []
  const digits = v.replace(/\D/g, '')
  const or: Record<string, unknown>[] = [
    { name: { $regex: escapeRegex(v), $options: 'i' } }
  ]
  if (digits.length >= 2) {
    or.push({ rut: { $regex: escapeRegex(digits), $options: 'i' } })
  } else {
    or.push({ rut: { $regex: escapeRegex(v), $options: 'i' } })
  }
  const users = await User.find({ $or: or })
    .select({ _id: 1 })
    .limit(80)
    .lean<{ _id: mongoose.Types.ObjectId }[]>()
  return users.map(u => u._id)
}

type LeanMailAnchor = {
  _id: mongoose.Types.ObjectId
  code?: string
  fromUserId: unknown
  toUserId: unknown
  toRut?: string
  isRecived?: boolean
  isRecivedInStore?: boolean
}

export type MailCodeSearchExpansionHint =
  | { kind: 'senderNotInStore'; fromUserId: string }
  | { kind: 'recipientInStore'; toUserId?: string; toRut?: string }
  | null

/**
 * Resuelve búsqueda por código (con expansión contextual igual al cliente).
 * Devuelve un filtro Mongo adicional, o `{ __empty: true }` si no hay matches.
 */
async function resolveCodeSearchMongoFilter(
  scope: Record<string, unknown>,
  searchId: string
): Promise<{
  filter: Record<string, unknown> | { __empty: true } | null
  expansion: MailCodeSearchExpansionHint
}> {
  const trimmed = searchId.trim()
  if (!trimmed) return { filter: null, expansion: null }

  const qCode = normalizeMailCodeForSearch(trimmed)
  const codePattern = escapeRegex(qCode).replace(/-/g, "[-'`´]")

  const or: Record<string, unknown>[] = []
  if (qCode) {
    or.push({ code: { $regex: codePattern, $options: 'i' } })
  }
  if (mongoose.Types.ObjectId.isValid(trimmed) && trimmed.length === 24) {
    or.push({ _id: new mongoose.Types.ObjectId(trimmed) })
  }
  if (or.length === 0) return { filter: { __empty: true }, expansion: null }

  const candidates = await Mail.find({
    ...scope,
    $or: or
  })
    .select({
      code: 1,
      fromUserId: 1,
      toUserId: 1,
      toRut: 1,
      isRecived: 1,
      isRecivedInStore: 1
    })
    .limit(40)
    .lean<LeanMailAnchor[]>()

  if (candidates.length === 0) {
    return { filter: { __empty: true }, expansion: null }
  }

  const exact =
    candidates.find(m => normalizeMailCodeForSearch(m.code ?? '') === qCode) ??
    (candidates.length === 1 ? candidates[0] : null)

  if (!exact) {
    return {
      filter: { _id: { $in: candidates.map(m => m._id) } },
      expansion: null
    }
  }

  if (isMailNotReceivedInStore(exact)) {
    const sender = filterFromUserFromRef(exact.fromUserId)
    if (!sender) {
      return { filter: { _id: exact._id }, expansion: null }
    }
    const fromOid = parseObjectId(sender.id)
    if (!fromOid) return { filter: { _id: exact._id }, expansion: null }
    return {
      filter: {
        fromUserId: fromOid,
        isRecived: false,
        isRecivedInStore: false
      },
      expansion: { kind: 'senderNotInStore', fromUserId: sender.id }
    }
  }

  if (isMailInStoreWaitingPickup(exact)) {
    const recipient = filterToRecipientFromMail(exact)
    if (!recipient) return { filter: { _id: exact._id }, expansion: null }
    if (recipient.kind === 'user') {
      const toOid = parseObjectId(recipient.id)
      if (!toOid) return { filter: { _id: exact._id }, expansion: null }
      return {
        filter: {
          toUserId: toOid,
          isRecived: false,
          isRecivedInStore: true
        },
        expansion: { kind: 'recipientInStore', toUserId: recipient.id }
      }
    }
    return {
      filter: {
        toUserId: { $exists: false },
        toRut: {
          $regex: recipient.rutKey
            .replace(/\D/g, '')
            .split('')
            .join('[.\\-\\s]?'),
          $options: 'i'
        },
        isRecived: false,
        isRecivedInStore: true
      },
      expansion: {
        kind: 'recipientInStore',
        toRut: recipient.rutDisplay
      }
    }
  }

  return { filter: { _id: exact._id }, expansion: null }
}

export async function buildMailAdminListMongoFilter(
  storeScope: Record<string, unknown>,
  filters: MailAdminListFilters
): Promise<{
  filter: Record<string, unknown> | null
  codeSearchExpansion: MailCodeSearchExpansionHint
}> {
  const parts: Record<string, unknown>[] = [storeScope]
  let codeSearchExpansion: MailCodeSearchExpansionHint = null

  const stage = stageMongoFilter(filters.stage)
  if (stage) parts.push(stage)

  const elapsed = elapsedMongoFilter(filters.elapsed)
  if (elapsed) parts.push(elapsed)

  const fromIdsExplicit =
    filters.fromUserIds != null ? parseObjectIds(filters.fromUserIds) : null
  const fromOid = parseObjectId(filters.fromUserId)
  if (fromIdsExplicit) {
    if (fromIdsExplicit.length === 0) {
      return { filter: null, codeSearchExpansion: null }
    }
    parts.push(
      fromIdsExplicit.length === 1
        ? { fromUserId: fromIdsExplicit[0] }
        : { fromUserId: { $in: fromIdsExplicit } }
    )
  } else if (fromOid) {
    parts.push({ fromUserId: fromOid })
  } else if (filters.fromQ?.trim()) {
    const ids = await userIdsMatchingParticipantQuery(filters.fromQ)
    if (ids.length === 0) {
      return { filter: null, codeSearchExpansion: null }
    }
    parts.push({ fromUserId: { $in: ids } })
  }

  const toIdsExplicit =
    filters.toUserIds != null ? parseObjectIds(filters.toUserIds) : null
  const toRutsExplicit =
    filters.toRuts != null
      ? filters.toRuts.map(r => r.trim()).filter(Boolean)
      : null
  const toOid = parseObjectId(filters.toUserId)

  if (toIdsExplicit != null || toRutsExplicit != null) {
    const toOr: Record<string, unknown>[] = []
    if (toIdsExplicit && toIdsExplicit.length > 0) {
      toOr.push(
        toIdsExplicit.length === 1
          ? { toUserId: toIdsExplicit[0] }
          : { toUserId: { $in: toIdsExplicit } }
      )
    }
    for (const rut of toRutsExplicit ?? []) {
      const toRutMatch = toRutDigitsRegex(rut)
      if (!toRutMatch) continue
      toOr.push({
        $and: [
          { $or: [{ toUserId: { $exists: false } }, { toUserId: null }] },
          toRutMatch
        ]
      })
    }
    if (toOr.length === 0) {
      return { filter: null, codeSearchExpansion: null }
    }
    parts.push(toOr.length === 1 ? toOr[0] : { $or: toOr })
  } else if (toOid) {
    parts.push({ toUserId: toOid })
  } else if (filters.toRut?.trim()) {
    const toRutMatch = toRutDigitsRegex(filters.toRut)
    if (!toRutMatch) {
      return { filter: null, codeSearchExpansion: null }
    }
    parts.push({
      $and: [
        { $or: [{ toUserId: { $exists: false } }, { toUserId: null }] },
        toRutMatch
      ]
    })
  } else if (filters.toQ?.trim()) {
    const ids = await userIdsMatchingParticipantQuery(filters.toQ)
    const toOr: Record<string, unknown>[] = []
    if (ids.length > 0) toOr.push({ toUserId: { $in: ids } })
    const toRutMatch = toRutDigitsRegex(filters.toQ)
    if (toRutMatch) {
      toOr.push({
        $and: [
          { $or: [{ toUserId: { $exists: false } }, { toUserId: null }] },
          toRutMatch
        ]
      })
    } else {
      const v = normalizeMailFilterSearchText(filters.toQ)
      if (v.length >= 2) {
        toOr.push({
          $and: [
            { $or: [{ toUserId: { $exists: false } }, { toUserId: null }] },
            { toRut: { $regex: escapeRegex(v), $options: 'i' } }
          ]
        })
      }
    }
    if (toOr.length === 0) {
      return { filter: null, codeSearchExpansion: null }
    }
    parts.push({ $or: toOr })
  }

  if (filters.q?.trim()) {
    const { filter: codeFilter, expansion } =
      await resolveCodeSearchMongoFilter(storeScope, filters.q)
    codeSearchExpansion = expansion
    if (codeFilter && '__empty' in codeFilter) {
      return { filter: null, codeSearchExpansion: null }
    }
    if (codeFilter) parts.push(codeFilter)
  }

  if (parts.length === 1) {
    return { filter: parts[0], codeSearchExpansion }
  }
  return { filter: { $and: parts }, codeSearchExpansion }
}

export type MailAdminListResult = {
  mails: unknown[]
  page: number
  limit: number
  total: number
  pageCount: number
  hasMore: boolean
  codeSearchExpansion: MailCodeSearchExpansionHint
}

export async function listMailsForAdmin(options: {
  storeScope: Record<string, unknown>
  filters: MailAdminListFilters
  page: number
  limit: number
}): Promise<MailAdminListResult> {
  const page = Math.max(1, options.page)
  const limit = Math.min(MAIL_LIST_MAX_LIMIT, Math.max(1, options.limit))
  const { filter: mongoFilter, codeSearchExpansion } =
    await buildMailAdminListMongoFilter(options.storeScope, options.filters)
  if (!mongoFilter) {
    return {
      mails: [],
      page,
      limit,
      total: 0,
      pageCount: 1,
      hasMore: false,
      codeSearchExpansion: null
    }
  }

  const skip = (page - 1) * limit
  const [total, mails] = await Promise.all([
    Mail.countDocuments(mongoFilter),
    Mail.find(mongoFilter)
      .select(MAIL_LIST_SELECT)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('fromUserId', 'name rut')
      .populate('toUserId', 'name rut')
      .lean()
  ])

  const pageCount = Math.max(1, Math.ceil(total / limit) || 1)
  return {
    mails,
    page,
    limit,
    total,
    pageCount,
    hasMore: skip + mails.length < total,
    codeSearchExpansion
  }
}

export async function listMailIdsForAdmin(options: {
  storeScope: Record<string, unknown>
  filters: MailAdminListFilters
  limit?: number
}): Promise<{ ids: string[]; total: number }> {
  const limit = Math.min(
    MAIL_LIST_IDS_MAX_LIMIT,
    Math.max(1, options.limit ?? MAIL_LIST_IDS_MAX_LIMIT)
  )
  const { filter: mongoFilter } = await buildMailAdminListMongoFilter(
    options.storeScope,
    options.filters
  )
  if (!mongoFilter) return { ids: [], total: 0 }

  const [total, rows] = await Promise.all([
    Mail.countDocuments(mongoFilter),
    Mail.find(mongoFilter)
      .select({ _id: 1 })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<{ _id: mongoose.Types.ObjectId }[]>()
  ])

  return {
    ids: rows.map(r => String(r._id)),
    total
  }
}

export type MailFilterOptionsResult = {
  fromUsers: FilterFromUser[]
  toRecipients: FilterToRecipient[]
}

/** Opciones ligeras para autocompletes del panel (sin payload de correos). */
export async function listMailFilterOptions(
  storeScope: Record<string, unknown>
): Promise<MailFilterOptionsResult> {
  type AggRow = {
    fromIds: mongoose.Types.ObjectId[]
    toIds: mongoose.Types.ObjectId[]
    toRuts: string[]
  }

  const [agg] = await Mail.aggregate<AggRow>([
    { $match: storeScope },
    {
      $facet: {
        fromIds: [
          { $group: { _id: '$fromUserId' } },
          { $match: { _id: { $type: 'objectId' } } },
          { $limit: 500 }
        ],
        toIds: [
          { $group: { _id: '$toUserId' } },
          { $match: { _id: { $type: 'objectId' } } },
          { $limit: 500 }
        ],
        toRuts: [
          {
            $match: {
              $or: [{ toUserId: { $exists: false } }, { toUserId: null }]
            }
          },
          { $group: { _id: '$toRut' } },
          { $match: { _id: { $type: 'string', $ne: '' } } },
          { $limit: 500 }
        ]
      }
    },
    {
      $project: {
        fromIds: '$fromIds._id',
        toIds: '$toIds._id',
        toRuts: '$toRuts._id'
      }
    }
  ])

  const fromIds = agg?.fromIds ?? []
  const toIds = agg?.toIds ?? []
  const toRuts = (agg?.toRuts ?? []).filter(
    (r): r is string => typeof r === 'string' && r.trim().length > 0
  )

  const userIdSet = [...new Set([...fromIds, ...toIds].map(id => String(id)))]
  const users =
    userIdSet.length === 0
      ? []
      : await User.find({
          _id: {
            $in: userIdSet.map(id => new mongoose.Types.ObjectId(id))
          }
        })
          .select({ name: 1, rut: 1 })
          .lean<
            { _id: mongoose.Types.ObjectId; name?: string; rut?: string }[]
          >()

  const userMap = new Map(
    users.map(u => [
      String(u._id),
      {
        id: String(u._id),
        name:
          typeof u.name === 'string' && u.name.trim() ? u.name : 'Sin nombre',
        rut: typeof u.rut === 'string' ? u.rut : ''
      } satisfies FilterFromUser
    ])
  )

  const fromUsers = fromIds
    .map(id => userMap.get(String(id)))
    .filter((u): u is FilterFromUser => Boolean(u))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))

  const toUsers: FilterToRecipient[] = toIds
    .map(id => {
      const u = userMap.get(String(id))
      if (!u) return null
      return {
        kind: 'user' as const,
        id: u.id,
        name: u.name,
        rut: u.rut
      }
    })
    .filter((u): u is Extract<FilterToRecipient, { kind: 'user' }> =>
      Boolean(u)
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))

  const toRutOptions: FilterToRecipient[] = []
  const seenRut = new Set<string>()
  for (const raw of toRuts) {
    const rutKey = rutCompareKey(raw)
    if (!rutKey || seenRut.has(rutKey)) continue
    seenRut.add(rutKey)
    toRutOptions.push({
      kind: 'toRut',
      id: `toRut:${rutKey}`,
      rutDisplay: raw.trim(),
      rutKey
    })
  }
  toRutOptions.sort((a, b) =>
    a.kind === 'toRut' && b.kind === 'toRut'
      ? a.rutDisplay.localeCompare(b.rutDisplay, 'es', { sensitivity: 'base' })
      : 0
  )

  return {
    fromUsers,
    toRecipients: [...toUsers, ...toRutOptions]
  }
}
