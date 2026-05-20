'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Step } from 'react-joyride'
import { cleanupOverlayBlockers } from '@/lib/overlay-blocker-cleanup'
import {
  getTourStepSelectors,
  waitForTourTargets
} from '@/lib/product-tour-targets-ready'
import {
  isProductTourCompleted,
  markProductTourCompleted,
  type ProductTourKey,
  type ProductTourOutcome
} from '@/lib/product-tour-storage'

type UseProductTourRunnerOptions = {
  tourKey: ProductTourKey
  enabled: boolean
  delayMs?: number
  /** Selectores que deben existir antes de iniciar (evita overlay bloqueante). */
  steps?: Step[]
}

function scheduleRunFalse(setRun: (value: boolean) => void): void {
  queueMicrotask(() => setRun(false))
}

export function useProductTourRunner({
  tourKey,
  enabled,
  delayMs = 500,
  steps = []
}: UseProductTourRunnerOptions) {
  const [run, setRun] = useState(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (enabled) return
    cleanupOverlayBlockers()
    scheduleRunFalse(setRun)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    cancelledRef.current = false

    if (isProductTourCompleted(tourKey)) {
      return () => {
        cancelledRef.current = true
      }
    }

    const selectors = getTourStepSelectors(steps)
    const initialSelectors = selectors.slice(0, 1)

    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelledRef.current || isProductTourCompleted(tourKey)) return

        cleanupOverlayBlockers()

        if (initialSelectors.length > 0) {
          const ready = await waitForTourTargets(initialSelectors)
          if (!ready || cancelledRef.current) {
            cleanupOverlayBlockers()
            return
          }
        }

        await new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve())
          })
        })

        if (cancelledRef.current || isProductTourCompleted(tourKey)) return
        setRun(true)
      })()
    }, delayMs)

    return () => {
      cancelledRef.current = true
      window.clearTimeout(timer)
      cleanupOverlayBlockers()
      scheduleRunFalse(setRun)
    }
  }, [tourKey, enabled, delayMs, steps])

  const finish = useCallback(
    (outcome: ProductTourOutcome) => {
      markProductTourCompleted(tourKey, outcome)
      setRun(false)
      cleanupOverlayBlockers()
    },
    [tourKey]
  )

  return { run: run && enabled, finish }
}

/** md = 900px (sidebar visible), lg = 1200px (rail en columna). */
export function useProductTourViewport() {
  const [viewport, setViewport] = useState({
    showDesktopNav: true,
    showMobileNav: false
  })

  useEffect(() => {
    const desktopMq = window.matchMedia('(min-width: 900px)')

    const sync = () => {
      setViewport({
        showDesktopNav: desktopMq.matches,
        showMobileNav: !desktopMq.matches
      })
    }

    const frame = requestAnimationFrame(sync)
    desktopMq.addEventListener('change', sync)
    return () => {
      cancelAnimationFrame(frame)
      desktopMq.removeEventListener('change', sync)
    }
  }, [])

  return viewport
}
