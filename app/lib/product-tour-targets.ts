/** Valores de `data-tour` usados por Joyride (selectores `[data-tour="…"]`). */
export type ProductTourTarget =
  (typeof PRODUCT_TOUR_TARGETS)[keyof typeof PRODUCT_TOUR_TARGETS]

export const PRODUCT_TOUR_TARGETS = {
  storeSwitcher: 'store-switcher',
  dashboardMainNav: 'dashboard-main-nav',
  dashboardMobileNav: 'dashboard-mobile-nav',
  dashboardRegisterMail: 'dashboard-register-mail',
  dashboardCardTiendas: 'dashboard-card-tiendas',
  dashboardDiscoverCard: 'dashboard-discover-card',
  storeHubHeading: 'store-hub-heading',
  storeHubWeeklyEvents: 'store-hub-weekly-events',
  storeHubRightRail: 'store-hub-right-rail',
  mobileRightRailTrigger: 'mobile-right-rail-trigger'
} as const

export function tourSelector(
  target: (typeof PRODUCT_TOUR_TARGETS)[keyof typeof PRODUCT_TOUR_TARGETS]
): string {
  return `[data-tour="${target}"]`
}
