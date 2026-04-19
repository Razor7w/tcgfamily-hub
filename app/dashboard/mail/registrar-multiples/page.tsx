'use client'

import { useState } from 'react'
import Link from 'next/link'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import MarkunreadMailboxOutlined from '@mui/icons-material/MarkunreadMailboxOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import DashboardModuleRouteGate from '@/components/dashboard/DashboardModuleRouteGate'
import RegisterMultipleMailsForm from '@/components/mails/RegisterMultipleMailsForm'

function RegistrarMultiplesHelpDialog({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="registrar-multiples-ayuda-titulo"
    >
      <DialogTitle id="registrar-multiples-ayuda-titulo">
        Cómo funciona
      </DialogTitle>
      <DialogContent>
        <Stack component="ul" spacing={1.25} sx={{ m: 0, pl: 2.25, py: 0.5 }}>
          <Typography component="li" variant="body2" color="text.secondary">
            Cada tarjeta es un envío: RUT del receptor y comentario opcional.
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Quedan pendientes de ingreso en tienda; cada uno tiene su código
            para identificar y retirar el paquete.
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            El cupo del día (hora Chile) se muestra arriba. Si borras un envío
            que aún no esté recepcionado en tienda, recuperas ese cupo.
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Con un RUT válido en la última fila se abre otra tarjeta (hasta tu
            cupo o 25 por sesión).
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            «Registrar todos» envía todas las filas válidas seguidas.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Entendido
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function RegistrarMultiplesContent() {
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        background: t =>
          `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: { xs: 2, sm: 4 }
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={2.5} sx={{ mb: 3 }}>
          <Button
            component={Link}
            href="/dashboard/mail"
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
            sx={{ alignSelf: 'flex-start' }}
          >
            Volver a mis correos
          </Button>

          <Stack
            direction="row"
            spacing={1}
            alignItems="flex-start"
            justifyContent="space-between"
            flexWrap="wrap"
          >
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              flexWrap="wrap"
            >
              <MarkunreadMailboxOutlined
                color="primary"
                sx={{ fontSize: 36 }}
              />
              <Box>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{ fontWeight: 700, lineHeight: 1.2 }}
                >
                  Registrar varios correos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Varios envíos en una pasada.
                </Typography>
              </Box>
            </Stack>
            <IconButton
              color="primary"
              aria-label="Cómo funciona"
              onClick={() => setHelpOpen(true)}
              sx={{ mt: { xs: 0, sm: 0.5 } }}
            >
              <InfoOutlinedIcon />
            </IconButton>
          </Stack>
        </Stack>

        <RegistrarMultiplesHelpDialog
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
        />

        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            borderColor: t => alpha(t.palette.text.primary, 0.1)
          }}
        >
          <RegisterMultipleMailsForm />
        </Paper>
      </Container>
    </Box>
  )
}

export default function RegistrarMultiplesPage() {
  return (
    <DashboardModuleRouteGate moduleId="mail">
      <RegistrarMultiplesContent />
    </DashboardModuleRouteGate>
  )
}
