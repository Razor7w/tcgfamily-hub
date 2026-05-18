import type { Step } from 'react-joyride'
import {
  PRODUCT_TOUR_TARGETS,
  tourSelector,
  type ProductTourTarget
} from '@/lib/product-tour-targets'

export const PRODUCT_TOUR_HORIZONTAL_SCROLL_ATTR =
  'data-product-tour-horizontal-scroll'

/** Pasos que en móvil requieren desplazar el carril horizontal hacia el panel derecho. */
const MOBILE_RAIL_SCROLL_TARGETS: ReadonlySet<ProductTourTarget> = new Set([
  PRODUCT_TOUR_TARGETS.storeHubRightRail,
  PRODUCT_TOUR_TARGETS.dashboardSuggestionRail
])

/** Antes de estos pasos, volver arriba en la página (p. ej. sugerencias tras scroll horizontal). */
const MOBILE_SCROLL_TOP_TARGETS: ReadonlySet<ProductTourTarget> = new Set([
  PRODUCT_TOUR_TARGETS.dashboardSuggestionRail
])

let savedScrollLeft = 0
let hasSavedScrollLeft = false

function isMobileHorizontalRailLayout(): boolean {
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

export function parseTourTargetDataTour(
  target: string | null | undefined
): ProductTourTarget | null {
  if (!target || typeof target !== 'string') return null
  const m = target.match(/\[data-tour="([^"]+)"\]/)
  const id = m?.[1]
  if (!id) return null
  if (
    Object.values(PRODUCT_TOUR_TARGETS).includes(id as ProductTourTarget)
  ) {
    return id as ProductTourTarget
  }
  return null
}

export function tourTargetNeedsMobileRailScroll(
  target: string | null | undefined
): boolean {
  const id = parseTourTargetDataTour(target)
  return id !== null && MOBILE_RAIL_SCROLL_TARGETS.has(id)
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

function getHorizontalScroller(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.querySelector(
    `[${PRODUCT_TOUR_HORIZONTAL_SCROLL_ATTR}]`
  ) as HTMLElement | null
}

function scrollScrollerToRevealRail(
  scroller: HTMLElement,
  target: string
): void {
  const tourId = parseTourTargetDataTour(target)
  const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth)

  if (
    tourId === PRODUCT_TOUR_TARGETS.storeHubRightRail ||
    tourId === PRODUCT_TOUR_TARGETS.dashboardSuggestionRail
  ) {
    scroller.scrollLeft = maxLeft
    return
  }

  const selector =
    target.length > 0
      ? target
      : tourSelector(PRODUCT_TOUR_TARGETS.storeHubRightRail)
  const el = document.querySelector(selector)
  if (el && el !== scroller) {
    const elRect = el.getBoundingClientRect()
    const scRect = scroller.getBoundingClientRect()
    const elLeftInScroller =
      elRect.left - scRect.left + scroller.scrollLeft
    const targetLeft = Math.min(
      maxLeft,
      Math.max(
        0,
        elLeftInScroller - (scroller.clientWidth - elRect.width) / 2
      )
    )
    scroller.scrollLeft = targetLeft
  } else {
    scroller.scrollLeft = maxLeft
  }
}

/** Antes de mostrar el paso: scroll instantáneo para que Joyride calcule bien el spotlight. */
export async function prepareMobileRailScrollForTourTarget(
  target: string | null | undefined
): Promise<void> {
  if (!isMobileHorizontalRailLayout()) return
  if (!tourTargetNeedsMobileRailScroll(target)) return

  const scroller = getHorizontalScroller()
  if (!scroller) return

  if (!hasSavedScrollLeft) {
    savedScrollLeft = scroller.scrollLeft
    hasSavedScrollLeft = true
  }

  scrollScrollerToRevealRail(
    scroller,
    typeof target === 'string' && target.length > 0
      ? target
      : tourSelector(PRODUCT_TOUR_TARGETS.storeHubRightRail)
  )

  await afterLayoutPaint()
}

/** Al volver a un paso sin panel lateral o al cerrar el tour. */
export async function restoreMobileRailScroll(): Promise<void> {
  if (!hasSavedScrollLeft) return
  const scroller = getHorizontalScroller()
  if (scroller) {
    scroller.scrollLeft = savedScrollLeft
  }
  savedScrollLeft = 0
  hasSavedScrollLeft = false
  await afterLayoutPaint()
}

/** Restaura carril horizontal y posición vertical al terminar el tour. */
export async function resetTourScrollPosition(): Promise<void> {
  await restoreMobileRailScroll()
  scrollWindowToTop()
  await afterLayoutPaint()
}

/** Añade `before` + `skipScroll` para que el overlay no se desalinee tras scroll horizontal. */
export function enrichTourStepsWithMobileRailScroll(
  steps: Step[],
  options?: { mobileRailLayout?: boolean }
): Step[] {
  const mobileRail =
    options?.mobileRailLayout ?? isMobileHorizontalRailLayout()

  return steps.map(step => {
    const target = typeof step.target === 'string' ? step.target : ''
    const needsRail = tourTargetNeedsMobileRailScroll(target)
    const needsScrollTop =
      mobileRail && tourTargetNeedsScrollToTop(target)
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
