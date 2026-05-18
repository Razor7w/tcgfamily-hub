'use client'

import Link from 'next/link'
import MarkunreadMailboxOutlinedIcon from '@mui/icons-material/MarkunreadMailboxOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useSession } from 'next-auth/react'
import ButtonBarCode from '@/components/molecule/ButtonBarCode'
import { useMyMails, type Mail } from '@/hooks/useMails'

const WAITING_MAILS_LIMIT = 5

function mailUserId(ref: { _id: string } | string): string {
  return typeof ref === 'object' ? ref._id : String(ref)
}

function isMailWaitingForPickup(mail: Mail, currentUserId: string): boolean {
  if (mail.isRecived || !mail.isRecivedInStore) return false
  if (!currentUserId) return false
  if (mailUserId(mail.fromUserId) === currentUserId) return false
  if (mail.toUserId && mailUserId(mail.toUserId) === currentUserId) return true
  return Boolean(mail.toRut?.trim())
}

type StoreHubMailsWaitingRailProps = {
  hubReady?: boolean
}

export default function StoreHubMailsWaitingRail({
  hubReady = true
}: StoreHubMailsWaitingRailProps) {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ''
  const { data, isPending, isError, error, refetch } = useMyMails({
    pendingOnly: true,
    inStoreOnly: true,
    limit: WAITING_MAILS_LIMIT,
    enabled: hubReady
  })

  const waiting = (data?.mails ?? []).filter(m =>
    isMailWaitingForPickup(m, currentUserId)
  )

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: t => alpha(t.palette.text.primary, 0.1)
      }}
    >
      <CardHeader
        avatar={
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: t => alpha(t.palette.warning.main, 0.12),
              color: 'warning.dark'
            }}
          >
            <MarkunreadMailboxOutlinedIcon fontSize="small" aria-hidden />
          </Box>
        }
        title="Listos en tienda"
        subheader="La tienda ya los recibió; te esperan para retirar"
        slotProps={{
          title: { variant: 'subtitle1', sx: { fontWeight: 800 } },
          subheader: { sx: { lineHeight: 1.45 } }
        }}
      />
      <CardContent sx={{ pt: 0 }}>
        {!hubReady || isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={26} />
          </Box>
        ) : isError ? (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              {error instanceof Error ? error.message : 'No se pudieron cargar'}
            </Typography>
            <Button size="small" variant="outlined" onClick={() => refetch()}>
              Reintentar
            </Button>
          </Stack>
        ) : waiting.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ lineHeight: 1.6 }}
          >
            No tienes correos en tienda pendientes de retiro.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {waiting.map(mail => {
              const dateLabel = mail.receivedInStoreAt
                ? new Date(mail.receivedInStoreAt).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'short'
                  })
                : new Date(mail.updatedAt).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'short'
                  })
              return (
                <Paper
                  key={mail._id}
                  variant="outlined"
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    borderColor: 'divider'
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.75}
                        sx={{ mb: 0.35 }}
                      >
                        <Chip
                          size="small"
                          color="warning"
                          label="En tienda"
                          sx={{ height: 22, fontWeight: 700 }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          {dateLabel}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums'
                        }}
                        noWrap
                      >
                        {mail.code ?? mail._id}
                      </Typography>
                    </Box>
                    <ButtonBarCode id={mail.code ?? mail._id} />
                  </Stack>
                </Paper>
              )
            })}
            <Button
              component={Link}
              href="/dashboard/mail"
              size="small"
              variant="text"
              fullWidth
              sx={{ fontWeight: 700, mt: 0.5 }}
            >
              Ver todos mis correos
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}
