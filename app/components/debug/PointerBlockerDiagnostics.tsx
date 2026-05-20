'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import {
  cleanupOverlayBlockers,
  probePointerBlockers,
  restoreBodyAriaHiddenAfterModalLeak,
  type PointerBlockerHit
} from '@/lib/overlay-blocker-cleanup'

const STORAGE_KEY = 'tcg-debug-pointers'

function collectAriaLeak(): string[] {
  if (typeof document === 'undefined') return []
  return Array.from(document.body.children)
    .filter(
      el =>
        el instanceof HTMLElement && el.getAttribute('aria-hidden') === 'true'
    )
    .map(el => {
      const html = el as HTMLElement
      return `${html.tagName}${html.id ? `#${html.id}` : ''}${html.className ? `.${String(html.className).split(' ')[0]}` : ''}`
    })
}

/**
 * Diagnóstico de capas que bloquean clics (solo desarrollo).
 * Activar: `?debugPointers=1` o `localStorage.setItem('tcg-debug-pointers','1')`
 */
export default function PointerBlockerDiagnostics() {
  const searchParams = useSearchParams()
  const fromUrl = searchParams.get('debugPointers') === '1'
  const [storageEnabled, setStorageEnabled] = useState(false)
  const [hits, setHits] = useState<PointerBlockerHit[]>([])
  const [ariaLeak, setAriaLeak] = useState<string[]>([])

  const enabled =
    process.env.NODE_ENV === 'development' && (fromUrl || storageEnabled)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const frame = requestAnimationFrame(() => {
      setStorageEnabled(localStorage.getItem(STORAGE_KEY) === '1')
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const scanAriaLeak = useCallback(() => {
    setAriaLeak(collectAriaLeak())
  }, [])

  const onPointer = useCallback(
    (e: PointerEvent) => {
      if (!enabled) return
      setHits(probePointerBlockers(e.clientX, e.clientY))
      scanAriaLeak()
    },
    [enabled, scanAriaLeak]
  )

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    const frame = requestAnimationFrame(() => {
      if (!cancelled) setAriaLeak(collectAriaLeak())
    })

    document.addEventListener('pointerdown', onPointer, true)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', onPointer, true)
    }
  }, [enabled, onPointer])

  if (process.env.NODE_ENV !== 'development' || !enabled) return null

  return (
    <Paper
      elevation={12}
      sx={{
        position: 'fixed',
        left: 8,
        top: 72,
        zIndex: 99999,
        maxWidth: 'min(92vw, 360px)',
        p: 1.25,
        pointerEvents: 'auto',
        bgcolor: 'rgba(0,0,0,0.88)',
        color: '#fff',
        fontSize: 11,
        fontFamily: 'monospace'
      }}
    >
      <Typography variant="caption" sx={{ color: '#7dd3fc', fontWeight: 700 }}>
        debugPointers — toca la pantalla
      </Typography>
      {ariaLeak.length > 0 ? (
        <Box sx={{ mt: 0.75, color: '#fca5a5' }}>
          aria-hidden en body: {ariaLeak.join(', ')}
        </Box>
      ) : (
        <Box sx={{ mt: 0.75, color: '#86efac' }}>
          sin aria-hidden en hijos de body
        </Box>
      )}
      {hits.length > 0 ? (
        <Box
          component="pre"
          sx={{ mt: 1, mb: 1, whiteSpace: 'pre-wrap', m: 0 }}
        >
          {hits
            .map(
              (h, i) =>
                `${i + 1}. ${h.tag}${h.id ? `#${h.id}` : ''} pe=${h.pointerEvents} pos=${h.position} z=${h.zIndex} aria=${h.ariaHidden ?? '-'} ${h.size}`
            )
            .join('\n')}
        </Box>
      ) : (
        <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
          Toca donde no responde el click
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          sx={{ fontSize: 10, py: 0.25 }}
          onClick={() => {
            restoreBodyAriaHiddenAfterModalLeak()
            scanAriaLeak()
          }}
        >
          aria fix
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          sx={{ fontSize: 10, py: 0.25 }}
          onClick={() => {
            cleanupOverlayBlockers()
            scanAriaLeak()
          }}
        >
          cleanup
        </Button>
      </Box>
    </Paper>
  )
}
