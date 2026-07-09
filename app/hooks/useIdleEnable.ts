'use client'

import { useEffect, useState } from 'react'

/** Habilita fetch tras idle (o timeout) para no competir con datos críticos. */
export function useIdleEnable(ready: boolean, timeoutMs = 1200): boolean {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!ready || enabled) return

    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(() => setEnabled(true), {
        timeout: timeoutMs
      })
      return () => cancelIdleCallback(id)
    }

    const id = window.setTimeout(() => setEnabled(true), 80)
    return () => window.clearTimeout(id)
  }, [ready, enabled, timeoutMs])

  return enabled
}
