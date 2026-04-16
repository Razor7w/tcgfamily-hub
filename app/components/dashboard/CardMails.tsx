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
import { CalendarMonth, Comment } from '@mui/icons-material'
import ButtonBarCode from '../molecule/ButtonBarCode'
import { useMyMails } from '@/hooks/useMails'
import { useSession } from 'next-auth/react'
import { getMailStatusChip } from '@/lib/mail-status'
import { format } from 'rut.js'

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
                ? `${to.name ?? '-'} (${format(to.rut ?? '') ?? '-'})`
                : mail.toRut
                  ? `RUT: ${format(mail.toRut ?? '') ?? '-'}`
                  : '-'
              : from
                ? `${from.name ?? '-'} (${format(from.rut ?? '') ?? '-'})`
                : '-'

              return (
                <Paper
                  key={mail._id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 1.2,
                    height: '100%'
                  }}
                >
                  {/* HEADER */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Chip
                      size="small"
                      color={status.color}
                      label={status.label}
                      sx={{ fontWeight: 700 }}
                    />
              
                    <Typography variant="caption" color="text.secondary">
                      Código: {mail.code ?? mail._id}
                    </Typography>
                  </Stack>
              
                  {/* MAIN CONTENT */}
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        lineHeight: 1.2,
                        wordBreak: 'break-word'
                      }}
                    >
                      {counterparty}
                    </Typography>
              
                    <Typography variant="caption" color="text.secondary">
                      {isEmisor ? 'Enviado por ti' : 'Recibido por ti'}
                    </Typography>
                  </Box>
              
                  {/* FOOTER */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <CalendarMonth fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {dateLabel}
                      </Typography>
                    </Stack>
              
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {mail.observations?.trim() && (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setCommentOpen(mail._id)}
                        >
                          <Comment fontSize="small" />
                        </IconButton>
                      )}
              
                      <ButtonBarCode id={mail.code ?? mail._id} />
                    </Stack>
                  </Stack>
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
