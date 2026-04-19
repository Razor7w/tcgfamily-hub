'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

function WeeklyParticipantsDialogContent({
  participantNames
}: {
  participantNames: string[]
}) {
  return (
    <List dense disablePadding>
      {participantNames.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Todavía no hay nadie inscrito.
        </Typography>
      ) : (
        participantNames.map((n, i) => (
          <ListItem
            key={`${i}-${n}`}
            disableGutters
            sx={{
              borderRadius: 1,
              mb: 0.5,
              px: 1,
              py: 0.75,
              bgcolor: t =>
                i % 2 === 0
                  ? alpha(t.palette.text.primary, 0.04)
                  : 'transparent'
            }}
          >
            <ListItemText
              primary={`${i + 1}. ${n}`}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: 500
              }}
            />
          </ListItem>
        ))
      )}
    </List>
  )
}

export default function WeeklyParticipantsDialog({
  open,
  onClose,
  eventTitle,
  participantNames
}: {
  open: boolean
  onClose: () => void
  eventTitle: string
  participantNames: string[]
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      scroll="paper"
      aria-labelledby="participants-dialog-title"
    >
      <DialogTitle id="participants-dialog-title">Participantes</DialogTitle>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ px: 3, pb: 0, mt: -1 }}
      >
        {eventTitle}
      </Typography>
      <DialogContent dividers sx={{ pt: 2 }}>
        <WeeklyParticipantsDialogContent participantNames={participantNames} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button variant="contained" onClick={onClose}>
          Listo
        </Button>
      </DialogActions>
    </Dialog>
  )
}
