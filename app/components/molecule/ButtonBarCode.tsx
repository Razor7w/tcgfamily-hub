'use client'

import { QrCode2 } from '@mui/icons-material'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography
} from '@mui/material'
import { useState } from 'react'
import Barcode from 'react-barcode'

interface ButtonBarCodeProps {
  id: string
  /** Icono compacto (por defecto) o botón con texto (mejor en listas tipo card). */
  trigger?: 'icon' | 'button'
  /** Solo aplica cuando trigger es "button". */
  fullWidth?: boolean
}

export default function ButtonBarCode({
  id,
  trigger = 'icon',
  fullWidth = false
}: ButtonBarCodeProps) {
  const [barcodeMailId, setBarcodeMailId] = useState<string | null>(null)
  const open = () => setBarcodeMailId(id)
  return (
    <>
      {trigger === 'button' ? (
        <Button
          variant="outlined"
          color="primary"
          size="medium"
          fullWidth={fullWidth}
          startIcon={<QrCode2 />}
          onClick={open}
          aria-label="Ver código de barras del correo"
          sx={{
            py: 1,
            fontWeight: 700,
            textTransform: 'none',
            borderWidth: 2,
            '&:hover': { borderWidth: 2 }
          }}
        >
          Ver código de barras
        </Button>
      ) : (
        <IconButton
          size="small"
          color="primary"
          onClick={open}
          title="Generar código por ID"
          sx={{ p: 1 }}
        >
          <QrCode2 fontSize="small" />
        </IconButton>
      )}
      <Dialog
        open={!!barcodeMailId}
        onClose={() => setBarcodeMailId(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { width: '100%', m: 1, maxWidth: t => t.breakpoints.values.sm }
        }}
      >
        <DialogTitle>Código del correo</DialogTitle>
        <DialogContent>
          {barcodeMailId && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                py: 2,
                width: '100%',
                minWidth: 0
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  wordBreak: 'break-all',
                  textAlign: 'center',
                  maxWidth: '100%'
                }}
              >
                ID: {barcodeMailId}
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 360,
                  minHeight: 80,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  '& svg': {
                    width: '100%',
                    height: 'auto',
                    maxHeight: 120
                  }
                }}
              >
                <Barcode
                  value={barcodeMailId}
                  format="CODE128"
                  displayValue
                  width={2}
                  height={60}
                  renderer="svg"
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBarcodeMailId(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
