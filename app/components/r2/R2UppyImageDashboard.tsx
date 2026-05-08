'use client'

import { Box, Typography } from '@mui/material'
import Uppy from '@uppy/core'
import AwsS3 from '@uppy/aws-s3'
import Dashboard from '@uppy/dashboard'
import ImageEditor from '@uppy/image-editor'
import esMX from '@uppy/locales/lib/es_MX.js'
import { useEffect, useRef } from 'react'

import '@uppy/core/css/style.min.css'
import '@uppy/dashboard/css/style.min.css'
import '@uppy/image-editor/css/style.min.css'
import 'cropperjs/dist/cropper.css'

type R2Meta = {
  publicUrl?: string
  objectKey?: string
}

const MAX_BYTES = 10 * 1024 * 1024

function createUppyWithoutDashboard(): Uppy<R2Meta> {
  const uppy = new Uppy<R2Meta>({
    id: 'r2-image-demo',
    locale: esMX,
    autoProceed: false,
    restrictions: {
      maxFileSize: MAX_BYTES,
      maxNumberOfFiles: 10,
      allowedFileTypes: ['image/*']
    }
  })

  uppy.use(AwsS3, {
    id: 'AwsS3',
    shouldUseMultipart: false,
    limit: 3,
    getUploadParameters: async (file, { signal }) => {
      const contentType =
        file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg'

      const res = await fetch('/api/r2/presign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        signal,
        body: JSON.stringify({
          filename: file.name || 'image',
          contentType
        })
      })

      const data = (await res.json()) as {
        uploadUrl?: string
        publicUrl?: string
        key?: string
        error?: string
      }

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo preparar la subida.')
      }
      if (!data.uploadUrl) {
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
          'Content-Type': contentType
        }
      }
    }
  })

  uppy.use(ImageEditor, {
    id: 'ImageEditor',
    quality: 0.85
  })

  return uppy
}

export default function R2UppyImageDashboard() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const uppy = createUppyWithoutDashboard()

    uppy.use(Dashboard, {
      id: 'Dashboard',
      inline: true,
      target: el,
      proudlyDisplayPoweredByUppy: false,
      hideProgressDetails: false,
      // theme: 'auto',
      height: 420,
      note: 'Solo imágenes (JPEG, PNG, WebP, GIF). Puedes recortar o rotar antes de subir.'
    })

    return () => {
      uppy.cancelAll()
      uppy.destroy()
    }
  }, [])

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {
          'Arrastra o elige imágenes (máx. 10MB c/u). Idioma: español (México). Subida directa a R2 con URL firmada.'
        }
      </Typography>
      <Box
        sx={{
          '& .uppy-Root': { fontFamily: 'inherit' },
          '& .uppy-Dashboard-inner': { width: '100%' }
        }}
      >
        <div ref={mountRef} className="uppy-Dashboard-mount" />
      </Box>
    </Box>
  )
}
