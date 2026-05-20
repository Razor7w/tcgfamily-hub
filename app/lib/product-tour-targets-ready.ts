import type { Step } from 'react-joyride'

export function getTourStepSelectors(steps: Step[]): string[] {
  return steps
    .map(step => (typeof step.target === 'string' ? step.target : ''))
    .filter((target): target is string => target.length > 0)
}

function isTargetInteractable(selector: string): boolean {
  const el = document.querySelector(selector)
  if (!el) return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

/**
 * Espera a que todos los targets del tour existan y sean visibles.
 * Evita el overlay de Joyride en `waiting` cuando el DOM aún no está listo.
 */
export function waitForTourTargets(
  selectors: string[],
  maxMs = 8000
): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false)
  if (selectors.length === 0) return Promise.resolve(true)

  const start = Date.now()

  return new Promise(resolve => {
    const tick = () => {
      const ready = selectors.every(isTargetInteractable)
      if (ready || Date.now() - start >= maxMs) {
        resolve(ready)
        return
      }
      requestAnimationFrame(tick)
    }
    tick()
  })
}
