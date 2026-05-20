/** Control del drawer del panel lateral en viewport menor a lg (tour y API interna). */
export const MOBILE_RIGHT_RAIL_DRAWER_OPEN =
  'tcgnexo:mobile-right-rail-drawer-open'
export const MOBILE_RIGHT_RAIL_DRAWER_CLOSE =
  'tcgnexo:mobile-right-rail-drawer-close'

export function requestOpenMobileRightRailDrawer(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(MOBILE_RIGHT_RAIL_DRAWER_OPEN))
}

export function requestCloseMobileRightRailDrawer(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(MOBILE_RIGHT_RAIL_DRAWER_CLOSE))
}
