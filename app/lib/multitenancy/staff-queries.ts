import mongoose from 'mongoose'
import WeeklyEvent from '@/models/WeeklyEvent'
import { ADMIN_WEEKLY_EVENTS_ORIGIN_FILTER } from '@/lib/admin-weekly-event-access'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'

type StaffStoreGate = {
  activeStoreOid: mongoose.Types.ObjectId
  primaryStoreOid?: mongoose.Types.ObjectId | null
}

export async function weeklyOfficialByIdForStaffGate(
  gate: StaffStoreGate,
  eventId: string
) {
  if (!mongoose.Types.ObjectId.isValid(eventId.trim())) return null
  const storeScope = mongoFilterByStore(
    gate.activeStoreOid,
    gate.primaryStoreOid ?? null
  ) as Record<string, unknown>
  const raw = await WeeklyEvent.findOne({
    _id: new mongoose.Types.ObjectId(eventId.trim()),
    ...(ADMIN_WEEKLY_EVENTS_ORIGIN_FILTER as Record<string, unknown>),
    ...storeScope
  }).exec()
  if (!raw || raw.tournamentOrigin === 'custom') return null
  return raw
}
