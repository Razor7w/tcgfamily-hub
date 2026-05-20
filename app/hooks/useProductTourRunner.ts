'use client'

import { useCallback, useEffect, useState } from 'react'
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
}

export function useProductTourRunner({
  tourKey,
  enabled,
  delayMs = 500
}: UseProductTourRunnerOptions) {
  const [run, setRun] = useState(false)

  useEffect(() => {
    if (!enabled) return
    if (isProductTourCompleted(tourKey)) return

    const timer = window.setTimeout(() => {
      if (!isProductTourCompleted(tourKey)) {
        setRun(true)
      }
    }, delayMs)

    return () => window.clearTimeout(timer)
  }, [tourKey, enabled, delayMs])

  const finish = useCallback(
    (outcome: ProductTourOutcome) => {
      markProductTourCompleted(tourKey, outcome)
      setRun(false)
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

    sync()
    desktopMq.addEventListener('change', sync)
    return () => {
      desktopMq.removeEventListener('change', sync)
    }
  }, [])

  return viewport
}
