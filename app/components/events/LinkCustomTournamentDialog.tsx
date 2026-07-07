'use client'

import { useMemo, useState } from 'react'
import LinkIcon from '@mui/icons-material/Link'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Radio from '@mui/material/Radio'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import {
  useLinkableOfficialTournaments,
  useMergeCustomIntoOfficial
} from '@/hooks/useWeeklyEvents'
import { useContributionAwardSnackbar } from '@/hooks/useContributionAwardSnackbar'

type LinkCustomTournamentDialogProps = {
  customEventId: string
  customTitle: string
  open: boolean
  onClose: () => void
  onMerged: (officialEventId: string) => void
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function recordLabel(
  record: { wins: number; losses: number; ties: number } | null
): string | null {
  if (!record) return null
  return `${record.wins}-${record.losses}-${record.ties}`
}

export default function LinkCustomTournamentDialog({
  customEventId,
  customTitle,
  open,
  onClose,
  onMerged
}: LinkCustomTournamentDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { notifyAwarded, snackbar } = useContributionAwardSnackbar()

  const { data, isPending, isError, error, refetch, isFetching } =
    useLinkableOfficialTournaments(customEventId, { enabled: open })

  const merge = useMergeCustomIntoOfficial()

  const tournaments = useMemo(
    () => data?.tournaments ?? [],
    [data?.tournaments]
  )

  const selected = useMemo(
    () => tournaments.find(t => t.eventId === selectedId) ?? null,
    [tournaments, selectedId]
  )

  const handleClose = () => {
    if (merge.isPending) return
    onClose()
  }

  const handleConfirm = () => {
    if (!selectedId) return
    merge.mutate(
      { customEventId, officialEventId: selectedId },
      {
        onSuccess: result => {
          notifyAwarded(
            result.contributionPointsAwarded,
            'Torneo vinculado al registro oficial'
          )
          onMerged(result.officialEventId)
        }
      }
    )
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Vincular a torneo oficial</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Se transferirán las rondas y el deck que reportaste en{' '}
            <strong>{customTitle}</strong> al torneo oficial. El resultado W-L-T
            y la posición final serán los del torneo principal. El torneo custom
            se eliminará.
          </Typography>

          {isPending ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress size={28} />
            </Stack>
          ) : isError ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => refetch()}>
                  Reintentar
                </Button>
              }
            >
              {error instanceof Error
                ? error.message
                : 'No se pudieron cargar torneos'}
            </Alert>
          ) : tournaments.length === 0 ? (
            <Alert severity="info">
              No hay torneos oficiales finalizados en los que hayas participado.
              Cuando la tienda cierre un torneo donde estés inscrito, podrás
              vincularlo aquí.
            </Alert>
          ) : (
            <List
              disablePadding
              sx={t => ({
                border: '1px solid',
                borderColor: alpha(t.palette.text.primary, 0.1),
                borderRadius: 2,
                overflow: 'hidden'
              })}
            >
              {tournaments.map(row => {
                const checked = selectedId === row.eventId
                const secondaryParts = [
                  formatWhen(row.startsAt),
                  recordLabel(row.myMatchRecord)
                    ? `Récord ${recordLabel(row.myMatchRecord)}`
                    : null,
                  row.hasMyReportedRounds ? 'Ya tienes bitácora' : null,
                  row.hasMyDeck ? 'Deck reportado' : null
                ].filter(Boolean)

                return (
                  <ListItemButton
                    key={row.eventId}
                    selected={checked}
                    onClick={() => setSelectedId(row.eventId)}
                    sx={{
                      alignItems: 'flex-start',
                      py: 1.25,
                      '&.Mui-selected': {
                        bgcolor: t => alpha(t.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <Radio checked={checked} sx={{ mt: -0.25, mr: 1 }} />
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={800}>
                          {row.title}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="span"
                        >
                          {secondaryParts.join(' · ')}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                )
              })}
            </List>
          )}

          {selected ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Solo se copiarán datos que falten en el torneo oficial. Si ya
                reportaste algo allí, se conservará tu registro previo.
              </Typography>
            </Box>
          ) : null}

          {merge.isError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {merge.error instanceof Error
                ? merge.error.message
                : 'No se pudo vincular'}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClose} disabled={merge.isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={!selectedId || merge.isPending || isPending || isFetching}
          >
            {merge.isPending ? 'Vinculando…' : 'Vincular y eliminar custom'}
          </Button>
        </DialogActions>
      </Dialog>
      {snackbar}
    </>
  )
}

type LinkCustomTournamentButtonProps = {
  customEventId: string
  customTitle: string
  onMerged: (officialEventId: string) => void
  fullWidth?: boolean
}

export function LinkCustomTournamentButton({
  customEventId,
  customTitle,
  onMerged,
  fullWidth
}: LinkCustomTournamentButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        startIcon={<LinkIcon />}
        onClick={() => setOpen(true)}
        fullWidth={fullWidth}
        sx={{ textTransform: 'none', fontWeight: 700 }}
      >
        Vincular a torneo oficial
      </Button>
      <LinkCustomTournamentDialog
        customEventId={customEventId}
        customTitle={customTitle}
        open={open}
        onClose={() => setOpen(false)}
        onMerged={officialEventId => {
          setOpen(false)
          onMerged(officialEventId)
        }}
      />
    </>
  )
}
