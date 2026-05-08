'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Typography
} from '@mui/material'

type PresignResponse = {
  uploadUrl: string
  key: string
  publicUrl: string
}

export type R2ImageUploaderProps = {
  title?: string
  /** Límite de tamaño en MB (cliente). */
  maxSizeMb?: number
  /** Carpeta base dentro del bucket (e.g. uploads, Avatar). */
  folder?: 'uploads' | 'Avatar'
  /** Callback con la URL pública final. */
  onUploaded?: (publicUrl: string, key: string) => void
}

export default function R2ImageUploader({
  title = 'Subir imagen (Cloudflare R2)',
  maxSizeMb = 10,
  folder = 'uploads',
  onUploaded
}: R2ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')
  const [publicUrl, setPublicUrl] = useState<string>('')
  const [key, setKey] = useState<string>('')

  const maxBytes = useMemo(
    () => Math.max(1, maxSizeMb) * 1024 * 1024,
    [maxSizeMb]
  )

  async function handlePick() {
    setError('')
    inputRef.current?.click()
  }

  async function handleFile(file: File) {
    setError('')
    setPublicUrl('')
    setKey('')

    if (!file.type?.startsWith('image/')) {
      setError('Selecciona un archivo de imagen.')
      return
    }
    if (file.size > maxBytes) {
      setError(`La imagen supera el límite de ${maxSizeMb}MB.`)
      return
    }

    setBusy(true)
    try {
      const presignRes = await fetch('/api/r2/presign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          folder
        })
      })
      const presignJson = (await presignRes.json()) as
        | PresignResponse
        | { error?: string }

      if (!presignRes.ok) {
        setError(
          (presignJson as { error?: string })?.error ||
            'No se pudo preparar la subida.'
        )
        return
      }

      const {
        uploadUrl,
        publicUrl: url,
        key: k
      } = presignJson as PresignResponse

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'content-type': file.type,
          'cache-control': 'public, max-age=31536000, immutable'
        },
        body: file
      })

      if (!putRes.ok) {
        setError(
          `La subida falló (HTTP ${putRes.status}). Revisa CORS del bucket R2.`
        )
        return
      }

      setPublicUrl(url)
      setKey(k)
      onUploaded?.(url, k)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2.5,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 1,
          flexWrap: 'wrap'
        }}
      >
        <Typography sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Máx. {maxSizeMb}MB
        </Typography>
      </Box>

      {busy ? <LinearProgress /> : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={handlePick}
          disabled={busy}
          sx={{ textTransform: 'none', fontWeight: 800 }}
        >
          Elegir imagen
        </Button>
        {publicUrl ? (
          <Button
            variant="outlined"
            component="a"
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            sx={{ textTransform: 'none', fontWeight: 800 }}
          >
            Abrir imagen
          </Button>
        ) : null}
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void handleFile(f)
        }}
      />

      {publicUrl ? (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            URL pública
          </Typography>
          <Box
            sx={{
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 12,
              p: 1,
              borderRadius: 1,
              bgcolor: 'action.hover',
              overflow: 'auto'
            }}
          >
            {publicUrl}
          </Box>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={publicUrl}
            alt="Imagen subida"
            style={{
              width: '100%',
              maxWidth: 720,
              height: 'auto',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          />

          <Typography variant="caption" color="text.secondary">
            Key: {key}
          </Typography>
        </Box>
      ) : null}
    </Paper>
  )
}
