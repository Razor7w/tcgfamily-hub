'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import Avatar from '@mui/material/Avatar'
import Uppy from '@uppy/core'
import AwsS3 from '@uppy/aws-s3'
import Dashboard from '@uppy/dashboard'
import ImageEditor from '@uppy/image-editor'
import esMX from '@uppy/locales/lib/es_MX.js'

import '@uppy/core/css/style.min.css'
import '@uppy/dashboard/css/style.min.css'
import '@uppy/image-editor/css/style.min.css'
import 'cropperjs/dist/cropper.css'

type R2Meta = {
  publicUrl?: string
  objectKey?: string
}

export type R2UppyProfileImageUploaderProps = {
  name: string
  currentImageUrl?: string
  maxSizeMb?: number
  onUploaded: (publicUrl: string, key: string) => void | Promise<void>
}

function createUppyProfileImage({
  maxBytes
}: {
  maxBytes: number
}): Uppy<R2Meta> {
  const uppy = new Uppy<R2Meta>({
    id: 'r2-profile-image',
    locale: esMX,
    autoProceed: false,
    restrictions: {
      maxFileSize: maxBytes,
      maxNumberOfFiles: 1,
      allowedFileTypes: ['image/*']
    }
  })

  uppy.use(AwsS3, {
    id: 'AwsS3',
    shouldUseMultipart: false,
    limit: 1,
    getUploadParameters: async (file, { signal }) => {
      const contentType =
        file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg'

      const res = await fetch('/api/r2/presign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        signal,
        body: JSON.stringify({
          filename: file.name || 'profile-image',
          contentType,
          folder: 'profileImages'
        })
      })

      const data = (await res.json()) as {
        uploadUrl?: string
        publicUrl?: string
        key?: string
        error?: string
      }

      if (!res.ok)
        throw new Error(data.error || 'No se pudo preparar la subida.')
      if (!data.uploadUrl || !data.publicUrl || !data.key) {
        throw new Error('Respuesta de presign inválida.')
      }

      uppy.setFileMeta(file.id, {
        publicUrl: data.publicUrl,
        objectKey: data.key
      })

      return {
        method: 'PUT' as const,
        url: data.uploadUrl,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      }
    }
  })

  uppy.use(ImageEditor, {
    id: 'ImageEditor',
    quality: 0.9
  })

  return uppy
}

export default function R2UppyProfileImageUploader({
  name,
  currentImageUrl,
  maxSizeMb = 10,
  onUploaded
}: R2UppyProfileImageUploaderProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [previewOverrideUrl, setPreviewOverrideUrl] = useState<string | null>(
    null
  )
  const objectUrlRef = useRef<string | null>(null)

  const maxBytes = useMemo(
    () => Math.max(1, maxSizeMb) * 1024 * 1024,
    [maxSizeMb]
  )

  const previewUrl = previewOverrideUrl ?? currentImageUrl ?? ''

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const uppy = createUppyProfileImage({ maxBytes })

    function updateObjectPreview(fileId: string) {
      const f = uppy.getFile(fileId)
      const data = f?.data
      if (!data) return

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(data as Blob)
      objectUrlRef.current = url
      setPreviewOverrideUrl(url)
    }

    uppy.on('file-added', file => {
      updateObjectPreview(file.id)
    })

    // Cuando termina el editor, el file.data ya es el blob editado.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uppy.on('file-editor:complete' as any, (file: { id?: string } | null) => {
      if (file?.id) updateObjectPreview(file.id)
    })

    uppy.on('file-removed', () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      setPreviewOverrideUrl(null)
    })

    uppy.on('upload-success', file => {
      const meta = (file?.meta || {}) as R2Meta
      const url = meta.publicUrl?.trim() || ''
      const key = meta.objectKey?.trim() || ''
      if (url && key) void onUploaded(url, key)
    })

    uppy.use(Dashboard, {
      id: 'Dashboard',
      inline: true,
      target: el,
      proudlyDisplayPoweredByUppy: false,
      hideProgressDetails: false,
      height: 460,
      note: 'Elige una imagen, edítala (recortar/rotar) y luego súbela como tu foto de perfil.'
    })

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      setPreviewOverrideUrl(null)
      uppy.cancelAll()
      uppy.destroy()
    }
  }, [maxBytes, onUploaded])

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Paper
        elevation={2}
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={previewUrl || undefined}
            alt={name || 'Usuario'}
            sx={{ width: 44, height: 44 }}
          />
          <Box sx={{ display: 'grid', gap: 0.25 }}>
            <Typography sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
              Previsualización (header)
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                maxWidth: { xs: 'min(52vw, 320px)', sm: 360 },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {name || 'Usuario'}
            </Typography>
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Máx. {maxSizeMb}MB
        </Typography>
      </Paper>

      <Box
        sx={{
          '& .uppy-Root': { fontFamily: 'inherit' },
          '& .uppy-Dashboard-inner': { width: '100%' },
          overflow: 'hidden'
        }}
      >
        <div ref={mountRef} className="uppy-Dashboard-mount" />
      </Box>
    </Box>
  )
}
