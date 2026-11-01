import mongoose from 'mongoose'
import {
  mailOtherBranchMessage,
  staffAcceptsBranchName,
  staffBranchKeyForEmail
} from '@/lib/mail-staff-branch'
import StoreBranch from '@/models/StoreBranch'

function branchIdString(raw: unknown): string {
  if (raw == null) return ''
  if (typeof raw === 'string') return raw.trim()
  if (typeof raw === 'object' && raw && '_id' in raw) {
    return branchIdString((raw as { _id: unknown })._id)
  }
  return String(raw)
}

/** `null` si esta cuenta puede aceptar el correo en esa sucursal. */
export async function otherBranchAcceptError(args: {
  email: string | null | undefined
  branchIds: unknown[]
}): Promise<string | null> {
  if (!staffBranchKeyForEmail(args.email)) return null

  const ids: mongoose.Types.ObjectId[] = []
  let missing = false
  for (const raw of args.branchIds) {
    const id = branchIdString(raw)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      missing = true
      continue
    }
    ids.push(new mongoose.Types.ObjectId(id))
  }

  const uniqueIds = [...new Set(ids.map(id => id.toString()))]
  const rows =
    uniqueIds.length > 0
      ? await StoreBranch.find({
          _id: { $in: uniqueIds.map(id => new mongoose.Types.ObjectId(id)) }
        })
          .select('name')
          .lean<Array<{ name?: string }>>()
      : []

  for (const row of rows) {
    const name = typeof row.name === 'string' ? row.name : ''
    if (!staffAcceptsBranchName(args.email, name)) {
      return mailOtherBranchMessage(name)
    }
  }

  if (missing || rows.length < uniqueIds.length) {
    return mailOtherBranchMessage('')
  }
  return null
}
