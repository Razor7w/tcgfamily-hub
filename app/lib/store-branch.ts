import mongoose from 'mongoose'
import StoreBranch, { type StoreBranchLean } from '@/models/StoreBranch'

export type StoreBranchRow = {
  id: string
  storeId: string
  name: string
  address: string
  isActive: boolean
  sortOrder: number
}

export function serializeStoreBranch(
  b: Pick<
    StoreBranchLean,
    '_id' | 'storeId' | 'name' | 'address' | 'isActive' | 'sortOrder'
  >
): StoreBranchRow {
  return {
    id: b._id.toString(),
    storeId: b.storeId.toString(),
    name: typeof b.name === 'string' ? b.name : '',
    address: typeof b.address === 'string' ? b.address : '',
    isActive: b.isActive !== false,
    sortOrder: typeof b.sortOrder === 'number' ? b.sortOrder : 0
  }
}

export function normalizeBranchName(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, 120)
}

export function normalizeBranchAddress(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().slice(0, 500)
}

/** Sucursales activas de una tienda, ordenadas para selectores. */
export async function listActiveBranchesForStore(
  storeOid: mongoose.Types.ObjectId
): Promise<StoreBranchRow[]> {
  const rows = await StoreBranch.find({ storeId: storeOid, isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean<StoreBranchLean[]>()
  return rows.map(serializeStoreBranch)
}

/** Todas las sucursales de la tienda (admin). */
export async function listBranchesForStoreAdmin(
  storeOid: mongoose.Types.ObjectId
): Promise<StoreBranchRow[]> {
  const rows = await StoreBranch.find({ storeId: storeOid })
    .sort({ isActive: -1, sortOrder: 1, name: 1 })
    .lean<StoreBranchLean[]>()
  return rows.map(serializeStoreBranch)
}

/**
 * Valida `branchId` al crear un correo.
 * - Si la tienda no tiene sucursales activas → ok sin branch.
 * - Si tiene ≥1 → exige un `branchId` activo de esa tienda.
 */
export async function resolveMailBranchIdForStore(options: {
  storeOid: mongoose.Types.ObjectId
  branchIdRaw: unknown
}): Promise<
  | { ok: true; branchOid: mongoose.Types.ObjectId | null }
  | { ok: false; error: string; status: number }
> {
  const active = await listActiveBranchesForStore(options.storeOid)
  if (active.length === 0) {
    return { ok: true, branchOid: null }
  }

  const raw =
    typeof options.branchIdRaw === 'string' ? options.branchIdRaw.trim() : ''
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) {
    return {
      ok: false,
      error: 'Selecciona una sucursal',
      status: 400
    }
  }
  const branchOid = new mongoose.Types.ObjectId(raw)
  const match = active.find(b => b.id === raw)
  if (!match) {
    return {
      ok: false,
      error: 'Sucursal no válida para esta tienda',
      status: 400
    }
  }
  return { ok: true, branchOid }
}

/**
 * Asignación / cambio de sucursal en correos existentes.
 * - `''` / `null` → quitar sucursal.
 * - Debe ser sucursal activa de la tienda.
 */
export async function resolveAssignableBranchId(options: {
  storeOid: mongoose.Types.ObjectId
  branchIdRaw: unknown
}): Promise<
  | { ok: true; branchOid: mongoose.Types.ObjectId | null }
  | { ok: false; error: string; status: number }
> {
  if (
    options.branchIdRaw === null ||
    options.branchIdRaw === undefined ||
    options.branchIdRaw === ''
  ) {
    return { ok: true, branchOid: null }
  }
  const raw =
    typeof options.branchIdRaw === 'string' ? options.branchIdRaw.trim() : ''
  if (!raw) {
    return { ok: true, branchOid: null }
  }
  if (!mongoose.Types.ObjectId.isValid(raw)) {
    return { ok: false, error: 'Sucursal inválida', status: 400 }
  }
  const branchOid = new mongoose.Types.ObjectId(raw)
  const row = await StoreBranch.findOne({
    _id: branchOid,
    storeId: options.storeOid,
    isActive: true
  })
    .select('_id')
    .lean()
  if (!row) {
    return {
      ok: false,
      error: 'Sucursal no válida o inactiva para esta tienda',
      status: 400
    }
  }
  return { ok: true, branchOid }
}
