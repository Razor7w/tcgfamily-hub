import { requestCloseMobileRightRailDrawer } from '@/lib/mobile-right-rail-drawer'
import { resetTourRailDrawerState } from '@/lib/product-tour-rail-scroll'

/** Portal que react-joyride deja en `document.body`. */
export const JOYRIDE_PORTAL_ELEMENT_ID = 'react-joyride-portal'

/**
 * MUI ModalManager marca hijos de `body` (p. ej. `#__next`) con aria-hidden al abrir
 * un Drawer. Si el Drawer se desmonta sin cerrar (navegación SPA), el atributo puede
 * quedar y en Safari/iOS bloquea toques aunque el overlay no sea visible.
 */
export function restoreBodyAriaHiddenAfterModalLeak(): void {
  if (typeof document === 'undefined') return

  for (const child of Array.from(document.body.children)) {
    if (!(child instanceof HTMLElement)) continue
    if (child.getAttribute('aria-hidden') !== 'true') continue

    if (child.classList.contains('MuiModal-root')) {
      const style = window.getComputedStyle(child)
      if (style.visibility === 'hidden' || style.display === 'none') {
        child.remove()
      }
      continue
    }

    child.removeAttribute('aria-hidden')
  }

  document.querySelectorAll('[inert]').forEach(el => {
    if (
      el instanceof HTMLElement &&
      !el.closest('.MuiModal-root') &&
      el !== document.body
    ) {
      el.removeAttribute('inert')
    }
  })
}

/**
 * Quita capas fijas que interceptan clics tras navegación SPA (tours, drawers, modales MUI).
 */
export function cleanupOverlayBlockers(): void {
  if (typeof document === 'undefined') return

  document.getElementById(JOYRIDE_PORTAL_ELEMENT_ID)?.remove()

  document.querySelectorAll('.react-joyride__overlay').forEach(node => {
    const portal =
      node.closest(`#${JOYRIDE_PORTAL_ELEMENT_ID}`) ?? node.parentElement
    portal?.remove()
  })

  document.querySelectorAll('[data-testid="overlay"]').forEach(node => {
    node.parentElement?.remove()
  })

  document.querySelectorAll('.MuiModal-root').forEach(root => {
    const style = window.getComputedStyle(root)
    if (style.visibility === 'hidden' || style.display === 'none') {
      root.remove()
      return
    }
    const backdrop = root.querySelector('.MuiBackdrop-root')
    if (!backdrop) return
    const backdropStyle = window.getComputedStyle(backdrop)
    if (
      backdropStyle.opacity === '0' ||
      backdropStyle.visibility === 'hidden'
    ) {
      root.remove()
    }
  })

  restoreBodyAriaHiddenAfterModalLeak()

  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
  document.body.style.pointerEvents = ''
  document.documentElement.style.overflow = ''

  requestCloseMobileRightRailDrawer()
  resetTourRailDrawerState()
}

/** @deprecated Usar cleanupOverlayBlockers */
export const cleanupProductTourUi = cleanupOverlayBlockers

export type PointerBlockerHit = {
  x: number
  y: number
  tag: string
  id: string
  className: string
  ariaHidden: string | null
  pointerEvents: string
  position: string
  zIndex: string
  size: string
}

/** Elemento superior en el punto (útil para ver qué capa roba el click). */
export function probePointerBlockers(
  x: number,
  y: number,
  limit = 6
): PointerBlockerHit[] {
  if (typeof document === 'undefined') return []

  return document
    .elementsFromPoint(x, y)
    .slice(0, limit)
    .map(el => {
      const html = el as HTMLElement
      const rect = html.getBoundingClientRect?.()
      const style = window.getComputedStyle(html)
      return {
        x,
        y,
        tag: html.tagName.toLowerCase(),
        id: html.id || '',
        className:
          typeof html.className === 'string'
            ? html.className.slice(0, 120)
            : '',
        ariaHidden: html.getAttribute('aria-hidden'),
        pointerEvents: style.pointerEvents,
        position: style.position,
        zIndex: style.zIndex,
        size: rect ? `${Math.round(rect.width)}×${Math.round(rect.height)}` : ''
      }
    })
}
