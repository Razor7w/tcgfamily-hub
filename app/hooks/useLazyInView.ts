'use client'

import { useEffect, useRef, useState } from 'react'

/** true cuando el elemento entra al viewport (rootMargin amplía precarga). */
export function useLazyInView(rootMargin = '120px'): {
  ref: (node: HTMLElement | null) => void
  inView: boolean
} {
  const [inView, setInView] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const nodeRef = useRef<HTMLElement | null>(null)

  const ref = (node: HTMLElement | null) => {
    nodeRef.current = node
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    if (!node || inView) return

    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setInView(true)
          observerRef.current?.disconnect()
          observerRef.current = null
        }
      },
      { rootMargin }
    )
    observerRef.current.observe(node)
  }

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  return { ref, inView }
}
