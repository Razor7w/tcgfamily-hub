export const DASHBOARD_MODULE_IDS = [
  "weeklyEvents",
  "myTournaments",
  "mail",
  "storePoints",
] as const;

export type DashboardModuleId = (typeof DASHBOARD_MODULE_IDS)[number];

export type DashboardModuleVisibility = Record<DashboardModuleId, boolean>;

export const DEFAULT_DASHBOARD_VISIBILITY: DashboardModuleVisibility = {
  weeklyEvents: true,
  myTournaments: true,
  mail: true,
  storePoints: true,
};

export const DEFAULT_DASHBOARD_ORDER: DashboardModuleId[] = [
  "weeklyEvents",
  "myTournaments",
  "mail",
  "storePoints",
];

export type DashboardModuleSettingsDTO = {
  visibility: DashboardModuleVisibility;
  order: DashboardModuleId[];
};

export function isDashboardModuleId(s: string): s is DashboardModuleId {
  return (DASHBOARD_MODULE_IDS as readonly string[]).includes(s);
}

export function normalizeDashboardOrder(
  raw: unknown,
): DashboardModuleId[] | null {
  if (!Array.isArray(raw)) return null;
  const list = raw.filter((x): x is string => typeof x === "string");
  if (list.length !== DASHBOARD_MODULE_IDS.length) return null;
  const set = new Set(list);
  if (set.size !== DASHBOARD_MODULE_IDS.length) return null;
  for (const id of DASHBOARD_MODULE_IDS) {
    if (!set.has(id)) return null;
  }
  return list as DashboardModuleId[];
}

/**
 * Datos guardados antes de separar «Mis torneos»: orden de 3 ítems sin `myTournaments`.
 */
function migrateLegacyDashboardOrder(raw: unknown): DashboardModuleId[] | null {
  if (!Array.isArray(raw)) return null;
  const list = raw.filter((x): x is string => typeof x === "string");
  const LEGACY = ["weeklyEvents", "mail", "storePoints"] as const;
  if (list.length !== LEGACY.length) return null;
  const set = new Set(list);
  if (set.size !== LEGACY.length) return null;
  for (const id of LEGACY) {
    if (!set.has(id)) return null;
  }
  if (list.includes("myTournaments")) return null;
  const idx = list.indexOf("weeklyEvents");
  const next = [...list];
  next.splice(idx + 1, 0, "myTournaments");
  return next as DashboardModuleId[];
}

export function mergeDashboardSettings(
  partial: Partial<DashboardModuleSettingsDTO> | null | undefined,
): DashboardModuleSettingsDTO {
  const visibility: DashboardModuleVisibility = {
    ...DEFAULT_DASHBOARD_VISIBILITY,
    ...partial?.visibility,
  };
  const order =
    normalizeDashboardOrder(partial?.order) ??
    migrateLegacyDashboardOrder(partial?.order) ??
    [...DEFAULT_DASHBOARD_ORDER];
  return { visibility, order };
}
