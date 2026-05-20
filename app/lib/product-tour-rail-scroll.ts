import type { Step } from 'react-joyride'
import {
  requestCloseMobileRightRailDrawer,
  requestOpenMobileRightRailDrawer
} from '@/lib/mobile-right-rail-drawer'
import {
  PRODUCT_TOUR_TARGETS,
  type ProductTourTarget
} from '@/lib/product-tour-targets'

/** Pasos que en móvil requieren abrir el drawer del panel lateral. */
const MOBILE_RAIL_DRAWER_TARGETS: ReadonlySet<ProductTourTarget> = new Set([
  PRODUCT_TOUR_TARGETS.storeHubRightRail,
  PRODUCT_TOUR_TARGETS.dashboardSuggestionRail
])

/** Antes de estos pasos, volver arriba en la página. */
const MOBILE_SCROLL_TOP_TARGETS: ReadonlySet<ProductTourTarget> = new Set([
  PRODUCT_TOUR_TARGETS.dashboardSuggestionRail
])

let drawerWasOpenByTour = false

/** Restaura el flag interno del drawer abierto por el tour (p. ej. al cambiar de ruta). */
export function resetTourRailDrawerState(): void {
  drawerWasOpenByTour = false
}

function isMobileDrawerRailLayout(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 1199px)').matches
}

function afterLayoutPaint(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

function afterDrawerTransition(): Promise<void> {
  return new Promise(resolve => {
    window.setTimeout(resolve, 320)
  })
}

export function parseTourTargetDataTour(
  target: string | null | undefined
): ProductTourTarget | null {
  if (!target || typeof target !== 'string') return null
  const m = target.match(/\[data-tour="([^"]+)"\]/)
  const id = m?.[1]
  if (!id) return null
  if (Object.values(PRODUCT_TOUR_TARGETS).includes(id as ProductTourTarget)) {
    return id as ProductTourTarget
  }
  return null
}

export function tourTargetNeedsMobileRailScroll(
  target: string | null | undefined
): boolean {
  const id = parseTourTargetDataTour(target)
  return id !== null && MOBILE_RAIL_DRAWER_TARGETS.has(id)
}

export function tourTargetNeedsScrollToTop(
  target: string | null | undefined
): boolean {
  const id = parseTourTargetDataTour(target)
  return id !== null && MOBILE_SCROLL_TOP_TARGETS.has(id)
}

function scrollWindowToTop(): void {
  if (typeof window === 'undefined') return
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

/** Antes de mostrar el paso: abre el drawer para que Joyride calcule bien el spotlight. */
export async function prepareMobileRailScrollForTourTarget(
  target: string | null | undefined
): Promise<void> {
  if (!isMobileDrawerRailLayout()) return
  if (!tourTargetNeedsMobileRailScroll(target)) return

  drawerWasOpenByTour = true
  requestOpenMobileRightRailDrawer()
  await afterLayoutPaint()
  await afterDrawerTransition()
}

/** Al volver a un paso sin panel lateral o al cerrar el tour. */
export async function restoreMobileRailScroll(): Promise<void> {
  if (!drawerWasOpenByTour) return
  drawerWasOpenByTour = false
  requestCloseMobileRightRailDrawer()
  await afterLayoutPaint()
}

/** Cierra el drawer y restaura scroll vertical al terminar el tour. */
export async function resetTourScrollPosition(): Promise<void> {
  resetTourRailDrawerState()
  await restoreMobileRailScroll()
  scrollWindowToTop()
  await afterLayoutPaint()
}

/** Añade `before` + `skipScroll` para el drawer en móvil. */
export function enrichTourStepsWithMobileRailScroll(
  steps: Step[],
  options?: { mobileRailLayout?: boolean }
): Step[] {
  const mobileRail = options?.mobileRailLayout ?? isMobileDrawerRailLayout()

  return steps.map(step => {
    const target = typeof step.target === 'string' ? step.target : ''
    const needsRail = tourTargetNeedsMobileRailScroll(target)
    const needsScrollTop = mobileRail && tourTargetNeedsScrollToTop(target)
    const userBefore = step.before

    const mobileRailPlacement =
      mobileRail && needsRail
        ? {
            placement: 'bottom' as const,
            offset: step.offset ?? 14,
            spotlightPadding: step.spotlightPadding ?? 8,
            spotlightRadius: step.spotlightRadius ?? 16
          }
        : {}

    return {
      ...step,
      ...mobileRailPlacement,
      skipScroll: needsRail ? true : step.skipScroll,
      before: async data => {
        if (needsScrollTop) {
          scrollWindowToTop()
          await afterLayoutPaint()
          await prepareMobileRailScrollForTourTarget(target)
        } else if (needsRail) {
          await prepareMobileRailScrollForTourTarget(target)
        } else {
          await restoreMobileRailScroll()
        }
        if (userBefore) {
          await userBefore(data)
        }
      }
    }
  })
}
