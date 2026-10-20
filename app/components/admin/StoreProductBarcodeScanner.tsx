'use client'

import { useEffect, useRef } from 'react'
import { Box, Button } from '@mui/material'

const READER_ID = 'store-product-barcode-reader'

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError') {
    return 'El navegador bloqueó la cámara. Revisa el permiso del sitio.'
  }
  if (name === 'NotFoundError') {
    return 'No se encontró una cámara en este equipo.'
  }
  if (name === 'NotReadableError') {
    return 'La cámara está ocupada por otra aplicación.'
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return 'No se pudo abrir la cámara.'
}

export default function StoreProductBarcodeScanner({
  onDetect,
  onClose,
  onError
}: {
  onDetect: (value: string) => void
  onClose: () => void
  onError: (message: string) => void
}) {
  const onDetectRef = useRef(onDetect)
  const onErrorRef = useRef(onError)
  const handledRef = useRef(false)
  onDetectRef.current = onDetect
  onErrorRef.current = onError

  useEffect(() => {
    if (!window.isSecureContext) {
      onErrorRef.current(
        'El navegador solo entrega la cámara en localhost o HTTPS. En una IP de red (http://192.168…) no la abre.'
      )
      return
    }

    let cancelled = false
    handledRef.current = false

    const start = async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } =
        await import('html5-qrcode')
      if (cancelled) return

      const scanner = new Html5Qrcode(READER_ID, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE
        ]
      })

      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            aspectRatio: 1.333,
            qrbox: (viewWidth, viewHeight) => ({
              width: Math.max(180, Math.min(viewWidth - 32, 320)),
              height: Math.max(80, Math.min(Math.round(viewHeight * 0.32), 150))
            }),
            disableFlip: false
          },
          decoded => {
            if (handledRef.current || cancelled) return
            handledRef.current = true
            onDetectRef.current(decoded)
          },
          () => undefined
        )
      } catch (error) {
        if (!cancelled) onErrorRef.current(cameraErrorMessage(error))
      }

      return scanner
    }

    const pending = start()
    return () => {
      cancelled = true
      void pending.then(scanner => {
        if (!scanner) return
        const stop = scanner.isScanning ? scanner.stop() : Promise.resolve()
        void stop
          .catch(() => undefined)
          .then(() => scanner.clear())
          .catch(() => undefined)
      })
    }
  }, [])

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'common.black'
      }}
    >
      <Box
        id={READER_ID}
        sx={{
          width: '100%',
          minHeight: { xs: 260, sm: 300 },
          '& video': {
            width: '100% !important',
            height: 'auto !important',
            objectFit: 'cover'
          }
        }}
      />
      <Button
        size="small"
        variant="contained"
        onClick={onClose}
        sx={{ position: 'absolute', bottom: 12, right: 12 }}
      >
        Cerrar cámara
      </Button>
    </Box>
  )
}
