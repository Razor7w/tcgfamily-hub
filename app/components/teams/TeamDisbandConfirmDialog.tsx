'use client'

import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

type TeamDisbandConfirmDialogProps = {
  open: boolean
  teamName?: string
  pending?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: () => void
}

export default function TeamDisbandConfirmDialog({
  open,
  teamName,
  pending = false,
  error = null,
  onClose,
  onConfirm
}: TeamDisbandConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => !pending && onClose()}
      fullWidth
      maxWidth="xs"
      aria-labelledby="disband-team-dialog-title"
      aria-describedby="disband-team-dialog-description"
    >
      <DialogTitle
        id="disband-team-dialog-title"
        sx={{ fontWeight: 800, pb: 1 }}
      >
        ¿Disolver el equipo?
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                bgcolor: t => alpha(t.palette.error.main, 0.12),
                color: 'error.main'
              }}
            >
              <WarningAmberOutlinedIcon fontSize="small" />
            </Box>
            <Box id="disband-team-dialog-description">
              <Typography variant="body2" color="text.secondary">
                {teamName ? (
                  <>
                    Se disolverá <strong>{teamName}</strong>. Todos los miembros
                    quedarán libres y la página pública dejará de mostrarse.
                  </>
                ) : (
                  'Todos los miembros quedarán libres y la página pública dejará de mostrarse.'
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Esta acción no se puede deshacer.
              </Typography>
            </Box>
          </Stack>
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0 }}>
        <Button onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={pending}
          onClick={onConfirm}
          sx={{ fontWeight: 700 }}
        >
          {pending ? 'Disolviendo…' : 'Disolver equipo'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
