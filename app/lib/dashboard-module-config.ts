export const DASHBOARD_MODULE_IDS = [
  "weeklyEvents",
  "mail",
  "storePoints",
] as const;

export type DashboardModuleId = (typeof DASHBOARD_MODULE_IDS)[number];

export type DashboardModuleVisibility = Record<DashboardModuleId, boolean>;

export const DEFAULT_DASHBOARD_VISIBILITY: DashboardModuleVisibility = {
  weeklyEvents: true,
  mail: true,
  storePoints: true,
};

export const DEFAULT_DASHBOARD_ORDER: DashboardModuleId[] = [
  "weeklyEvents",
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

export function mergeDashboardSettings(
  partial: Partial<DashboardModuleSettingsDTO> | null | undefined,
): DashboardModuleSettingsDTO {
  const visibility: DashboardModuleVisibility = {
    ...DEFAULT_DASHBOARD_VISIBILITY,
    ...partial?.visibility,
  };
  const order =
    normalizeDashboardOrder(partial?.order) ?? [...DEFAULT_DASHBOARD_ORDER];
  return { visibility, order };
}
