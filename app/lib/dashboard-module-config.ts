export const DASHBOARD_MODULE_IDS = [
  'weeklyEvents',
  'leagues',
  'recentPublicDecklists',
  'myTournaments',
  'statistics',
  'mail',
  'storePoints'
] as const

export type DashboardModuleId = (typeof DASHBOARD_MODULE_IDS)[number]

/**
 * Alcance del módulo en el modelo multi-tienda.
 * - `store`: experiencia centrada en la tienda activa (JWT/contexto superior).
 * - `player`: actividad y datos personales del usuario en el hub.
 *
 * Persistencia: sigue siendo un solo vector `order` en BD (`[...store, ...player]`);
 * el layout del inicio muestra primero todos los bloques de tienda, luego todos los del jugador.
 */
export type DashboardModuleScope = 'store' | 'player'

/** Metadatos fijos por módulo (no se guardan en Mongo). Actualizar al añadir un `DashboardModuleId` nuevo. */
export const DASHBOARD_MODULE_SCOPE: Record<
  DashboardModuleId,
  DashboardModuleScope
> = {
  weeklyEvents: 'store',
  leagues: 'store',
  recentPublicDecklists: 'player',
  myTournaments: 'player',
  statistics: 'player',
  mail: 'store',
  storePoints: 'store'
}

export const DASHBOARD_SECTION_COPY: Record<
  DashboardModuleScope,
  { title: string; description: string }
> = {
  store: {
    title: 'En tu tienda activa',
    description:
      'Eventos locales, ligas, correo físico y puntos enlazados al contexto seleccionado en la barra superior.'
  },
  player: {
    title: 'Tu actividad como jugador',
    description:
      'Torneos y estadísticas de tu perfil. Los últimos mazos públicos de la comunidad están en Inicio. La tienda activa define si ves cada bloque aquí y en qué orden.'
  }
}

/** IDs de cada alcance en el orden estable de concatenación `[store..., player...]`. */
export function dashboardModuleIdsForScope(
  scope: DashboardModuleScope
): DashboardModuleId[] {
  return DASHBOARD_MODULE_IDS.filter(id => DASHBOARD_MODULE_SCOPE[id] === scope)
}

/**
 * Módulos que no aparecen en la UI de configuración (/admin/configuracion);
 * comportamiento fijo en el cliente (p. ej. siempre visible en Inicio).
 */
export function dashboardModuleIdsForAdminEditor(
  scope: DashboardModuleScope
): Exclude<DashboardModuleId, 'recentPublicDecklists'>[] {
  return dashboardModuleIdsForScope(scope).filter(
    (id): id is Exclude<DashboardModuleId, 'recentPublicDecklists'> =>
      id !== 'recentPublicDecklists'
  )
}

/** Orden jugador editable en admin (sin mazos públicos, fijos en Inicio). */
export function playerOrderForAdminEditor(
  persistedOrder: DashboardModuleId[]
): Exclude<DashboardModuleId, 'recentPublicDecklists'>[] {
  return splitDashboardOrder(persistedOrder).playerOrder.filter(
    (id): id is Exclude<DashboardModuleId, 'recentPublicDecklists'> =>
      id !== 'recentPublicDecklists'
  )
}

/** Reconstituye el vector `order` completo tras guardar el editor admin. */
export function composePersistedDashboardOrderFromAdminState(
  storeOrder: DashboardModuleId[],
  editablePlayerOrder: Exclude<DashboardModuleId, 'recentPublicDecklists'>[]
): DashboardModuleId[] {
  return canonicalizeDashboardOrder([
    ...storeOrder,
    'recentPublicDecklists',
    ...editablePlayerOrder
  ])
}

/** Visibilidad que admite configuración admin (sin módulos fijos en cliente). */
export function configurableDashboardVisibilitySnapshot(
  v: DashboardModuleVisibility
): Omit<DashboardModuleVisibility, 'recentPublicDecklists'> {
  const snap: Partial<DashboardModuleVisibility> = {}
  for (const id of DASHBOARD_MODULE_IDS) {
    if (id === 'recentPublicDecklists') continue
    snap[id] = v[id]
  }
  return snap as Omit<DashboardModuleVisibility, 'recentPublicDecklists'>
}

/** Divide el orden persistido en dos listas (misma concatenación ↔ `mergeScopedDashboardOrders`). */
export function splitDashboardOrder(order: DashboardModuleId[]): {
  storeOrder: DashboardModuleId[]
  playerOrder: DashboardModuleId[]
} {
  const storeOrder: DashboardModuleId[] = []
  const playerOrder: DashboardModuleId[] = []
  for (const id of order) {
    if (DASHBOARD_MODULE_SCOPE[id] === 'store') storeOrder.push(id)
    else playerOrder.push(id)
  }
  return { storeOrder, playerOrder }
}

export function mergeScopedDashboardOrders(
  storeOrder: DashboardModuleId[],
  playerOrder: DashboardModuleId[]
): DashboardModuleId[] {
  return [...storeOrder, ...playerOrder]
}

/**
 * Orden persistido canónico para multi-tienda: subsecuencia `store` seguida de
 * subsecuencia `player`, manteniendo el orden relativo dentro de cada alcance.
 */
export function canonicalizeDashboardOrder(
  order: DashboardModuleId[]
): DashboardModuleId[] {
  const { storeOrder, playerOrder } = splitDashboardOrder(order)
  return mergeScopedDashboardOrders(storeOrder, playerOrder)
}

/** Módulos visibles del alcance, respetando el orden dentro del vector `order` global. */
export function orderModulesForScope(
  order: DashboardModuleId[],
  visibility: DashboardModuleVisibility,
  scope: DashboardModuleScope
): DashboardModuleId[] {
  return order.filter(
    id => visibility[id] && DASHBOARD_MODULE_SCOPE[id] === scope
  )
}

export type DashboardModuleVisibility = Record<DashboardModuleId, boolean>

export const DEFAULT_DASHBOARD_VISIBILITY: DashboardModuleVisibility = {
  weeklyEvents: true,
  leagues: true,
  recentPublicDecklists: true,
  myTournaments: true,
  statistics: true,
  mail: true,
  storePoints: true
}

/** Orden canónico persistido: primero todos los `store`, luego todos los `player`. */
export const DEFAULT_DASHBOARD_ORDER: DashboardModuleId[] =
  mergeScopedDashboardOrders(
    dashboardModuleIdsForScope('store'),
    dashboardModuleIdsForScope('player')
  )

/** Accesos rápidos en Inicio (/dashboard). */
export type DashboardShortcutsVisibility = {
  createMail: boolean
  createTournament: boolean
  /** Atajo a la página de lista PDF (Play! Pokémon). */
  playPokemonDecklistPdf: boolean
}

export const DEFAULT_DASHBOARD_SHORTCUTS: DashboardShortcutsVisibility = {
  createMail: true,
  createTournament: true,
  playPokemonDecklistPdf: true
}

export type DashboardModuleSettingsDTO = {
  visibility: DashboardModuleVisibility
  order: DashboardModuleId[]
  shortcuts: DashboardShortcutsVisibility
}

export function isDashboardModuleId(s: string): s is DashboardModuleId {
  return (DASHBOARD_MODULE_IDS as readonly string[]).includes(s)
}

export function normalizeDashboardOrder(
  raw: unknown
): DashboardModuleId[] | null {
  if (!Array.isArray(raw)) return null
  const list = raw.filter((x): x is string => typeof x === 'string')
  if (list.length !== DASHBOARD_MODULE_IDS.length) return null
  const set = new Set(list)
  if (set.size !== DASHBOARD_MODULE_IDS.length) return null
  for (const id of DASHBOARD_MODULE_IDS) {
    if (!set.has(id)) return null
  }
  return list as DashboardModuleId[]
}

/** Orden guardado con 5 módulos (sin «Últimos públicos»). */
function migrateFiveModuleOrder(raw: unknown): DashboardModuleId[] | null {
  if (!Array.isArray(raw)) return null
  const list = raw.filter((x): x is string => typeof x === 'string')
  const LEGACY_FIVE = [
    'weeklyEvents',
    'myTournaments',
    'statistics',
    'mail',
    'storePoints'
  ] as const
  if (list.length !== LEGACY_FIVE.length) return null
  const set = new Set(list)
  if (set.size !== LEGACY_FIVE.length) return null
  for (const id of LEGACY_FIVE) {
    if (!set.has(id)) return null
  }
  if (set.has('recentPublicDecklists')) return null
  const idx = list.indexOf('weeklyEvents')
  if (idx < 0) return null
  const next = [...list]
  next.splice(idx + 1, 0, 'recentPublicDecklists')
  return next as DashboardModuleId[]
}

/** Orden persistido con 4 módulos (antes de «Estadísticas» en el panel). */
function migrateFourModuleOrder(raw: unknown): DashboardModuleId[] | null {
  if (!Array.isArray(raw)) return null
  const list = raw.filter((x): x is string => typeof x === 'string')
  const LEGACY_FOUR = [
    'weeklyEvents',
    'myTournaments',
    'mail',
    'storePoints'
  ] as const
  if (list.length !== LEGACY_FOUR.length) return null
  const set = new Set(list)
  if (set.size !== LEGACY_FOUR.length) return null
  for (const id of LEGACY_FOUR) {
    if (!set.has(id)) return null
  }
  if (set.has('statistics')) return null
  const idx = list.indexOf('myTournaments')
  if (idx < 0) return null
  const next = [...list]
  next.splice(idx + 1, 0, 'statistics')
  return next as DashboardModuleId[]
}

/**
 * Datos guardados antes de separar «Mis torneos»: orden de 3 ítems sin `myTournaments`.
 */
function migrateLegacyDashboardOrder(raw: unknown): DashboardModuleId[] | null {
  if (!Array.isArray(raw)) return null
  const list = raw.filter((x): x is string => typeof x === 'string')
  const LEGACY = ['weeklyEvents', 'mail', 'storePoints'] as const
  if (list.length !== LEGACY.length) return null
  const set = new Set(list)
  if (set.size !== LEGACY.length) return null
  for (const id of LEGACY) {
    if (!set.has(id)) return null
  }
  if (list.includes('myTournaments')) return null
  const idx = list.indexOf('weeklyEvents')
  const next = [...list]
  next.splice(idx + 1, 0, 'myTournaments')
  return next as DashboardModuleId[]
}

/**
 * Orden guardado antes de existir `leagues`: permutación válida de 6 IDs.
 * Inserta `leagues` justo después de `weeklyEvents`.
 */
function insertLeaguesIfMissingIntoOrder(
  order: DashboardModuleId[]
): DashboardModuleId[] {
  if (order.includes('leagues')) return order
  const missing = DASHBOARD_MODULE_IDS.filter(id => !order.includes(id))
  if (
    missing.length !== 1 ||
    missing[0] !== 'leagues' ||
    order.length !== DASHBOARD_MODULE_IDS.length - 1
  ) {
    return order
  }
  const idx = order.indexOf('weeklyEvents')
  if (idx < 0) return order
  const next = [...order]
  next.splice(idx + 1, 0, 'leagues')
  return next
}

export function mergeDashboardSettings(
  partial: Partial<DashboardModuleSettingsDTO> | null | undefined
): DashboardModuleSettingsDTO {
  const visibility: DashboardModuleVisibility = {
    ...DEFAULT_DASHBOARD_VISIBILITY,
    ...partial?.visibility
  }
  let order =
    normalizeDashboardOrder(partial?.order) ??
    migrateFiveModuleOrder(partial?.order) ??
    migrateFourModuleOrder(partial?.order) ??
    migrateLegacyDashboardOrder(partial?.order) ?? [...DEFAULT_DASHBOARD_ORDER]
  order = insertLeaguesIfMissingIntoOrder(order)
  const shortcuts: DashboardShortcutsVisibility = {
    ...DEFAULT_DASHBOARD_SHORTCUTS,
    ...partial?.shortcuts
  }
  return {
    visibility: {
      ...visibility,
      recentPublicDecklists: true
    },
    order: canonicalizeDashboardOrder(order),
    shortcuts
  }
}
