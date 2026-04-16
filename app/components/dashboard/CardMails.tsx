'use client'

import { useState } from 'react'
import Link from 'next/link'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import {
  Box,
  Chip,
  CircularProgress,
  Stack
} from '@mui/material'
import { CalendarMonth, Comment, NorthEast, SouthWest } from '@mui/icons-material'
import ButtonBarCode from '../molecule/ButtonBarCode'
import { useMyMails } from '@/hooks/useMails'
import { useSession } from 'next-auth/react'
import { getMailStatusChip } from '@/lib/mail-status'

const PENDING_MAILS_LIMIT = 4

function mailUserId(ref: { _id: string } | string): string {
  return typeof ref === 'object' ? ref._id : String(ref)
}

export default function CardMails() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ''
  const [commentOpen, setCommentOpen] = useState<string | null>(null)
  const { data, isLoading, error } = useMyMails({ limit: PENDING_MAILS_LIMIT })

  const mails = data?.mails ?? []

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (error) {
    return (
      <Typography color="text.secondary">
        No se pudieron cargar los correos: {error.message}
      </Typography>
    )
  }

  if (mails.length === 0) {
    return (
      <Box
        sx={{
          py: 5,
          px: 2,
          textAlign: 'center',
          borderRadius: 1,
          bgcolor: theme => theme.palette.action.hover
        }}
      >
        <Typography variant="body1" color="text.secondary" gutterBottom>
          No tienes correos registrados.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Los correos que registres (como emisor) y los que estén a tu nombre aparecerán aquí.
        </Typography>
        <Button component={Link} href="/dashboard/mail" size="small" variant="outlined">
          Ver historial de correos
        </Button>
      </Box>
    )
  }

  const commentText =
    commentOpen != null
      ? mails.find(m => m._id === commentOpen)?.observations?.trim() ?? ''
      : ''

  return (
    <>
      <Card variant="outlined">
        <CardContent sx={{ pt: 2 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              columnGap: 2,
              rowGap: 1.5
            }}
          >
          {mails.map(mail => {
            const from = typeof mail.fromUserId === 'object' ? mail.fromUserId : null
            const to = typeof mail.toUserId === 'object' ? mail.toUserId : null
            const isEmisor = currentUserId && mailUserId(mail.fromUserId) === currentUserId
            const status = getMailStatusChip(mail)
            const dateLabel = new Date(mail.createdAt).toLocaleDateString('es-CL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
            const counterparty = isEmisor
              ? to
                ? `${to.name ?? '-'} (${to.rut ?? '-'})`
                : mail.toRut
                  ? `RUT: ${mail.toRut}`
                  : '-'
              : from
                ? `${from.name ?? '-'} (${from.rut ?? '-'})`
                : '-'

            return (
              <Paper
                key={mail._id}
                variant="outlined"
                sx={{
                  p: 1.25,
                  minWidth: 0,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 1
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      variant="outlined"
                      color={isEmisor ? 'primary' : 'default'}
                      icon={isEmisor ? <NorthEast /> : <SouthWest />}
                      label={isEmisor ? 'Emisor' : 'Receptor'}
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      size="small"
                      color={status.color}
                      label={status.label}
                      sx={{ fontWeight: 600 }}
                    />
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <CalendarMonth fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {dateLabel}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Typography
                    variant="body2"
                    sx={{ mt: 0.5, wordBreak: 'break-word' }}
                  >
                    {counterparty}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Código: {mail.code ?? mail._id}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    flexShrink: 0,
                    alignSelf: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.25
                  }}
                >
                  {mail.observations?.trim() ? (
                    <IconButton
                      size="small"
                      color="primary"
                      aria-label="Ver comentarios"
                      onClick={() => setCommentOpen(mail._id)}
                    >
                      <Comment fontSize="small" />
                    </IconButton>
                  ) : null}
                  <ButtonBarCode id={mail.code ?? mail._id} />
                </Box>
              </Paper>
            )
          })}
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={commentOpen != null}
        onClose={() => setCommentOpen(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Comentarios</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', pt: 0.5 }}>
            {commentText || 'Sin comentarios.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setCommentOpen(null)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
