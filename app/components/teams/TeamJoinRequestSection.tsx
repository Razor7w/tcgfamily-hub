'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import {
  useCancelTeamJoinRequest,
  useMyTeamJoinRequest,
  useRequestJoinTeam,
  useTeamsMe
} from '@/hooks/useTeams'

type Props = {
  teamSlug: string
  teamName: string
}

export default function TeamJoinRequestSection({ teamSlug, teamName }: Props) {
  const { status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const { data: me, isPending: mePending } = useTeamsMe()
  const { data: joinRequestData, isPending: joinRequestPending } =
    useMyTeamJoinRequest(teamSlug, isAuthenticated)
  const requestJoin = useRequestJoinTeam(teamSlug)
  const cancelJoin = useCancelTeamJoinRequest(teamSlug)

  const signInHref = `/?callbackUrl=${encodeURIComponent(`/equipos/${teamSlug}`)}`

  if (!isAuthenticated) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 3,
          bgcolor: t => alpha(t.palette.primary.main, 0.04)
        }}
      >
        <Stack spacing={1.25}>
          <Typography variant="subtitle1" fontWeight={700}>
            ¿Quieres unirte a {teamName}?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Inicia sesión y envía una solicitud. El capitán podrá aceptarla o
            rechazarla.
          </Typography>
          <Button
            component={Link}
            href={signInHref}
            variant="contained"
            sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
          >
            Iniciar sesión para solicitar
          </Button>
        </Stack>
      </Paper>
    )
  }

  if (mePending || joinRequestPending) return null

  if (me?.membership) {
    if (me.membership.teamSlug === teamSlug) return null
    return (
      <Alert severity="info">
        Ya perteneces a {me.membership.teamName}. Solo puedes estar en un equipo
        a la vez.
      </Alert>
    )
  }

  if (me?.application) {
    return (
      <Alert severity="info">
        Tienes una solicitud pendiente para crear tu propio equipo. Resuélvela
        antes de unirte a otro.
      </Alert>
    )
  }

  const pendingRequest = joinRequestData?.joinRequest

  if (pendingRequest) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              Solicitud enviada
            </Typography>
            <Typography variant="body2" color="text.secondary">
              El capitán de {teamName} revisará tu solicitud.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            disabled={cancelJoin.isPending}
            onClick={() => void cancelJoin.mutateAsync()}
            sx={{ textTransform: 'none', flexShrink: 0 }}
          >
            {cancelJoin.isPending ? 'Cancelando…' : 'Cancelar solicitud'}
          </Button>
        </Stack>
        {cancelJoin.isError ? (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {cancelJoin.error instanceof Error
              ? cancelJoin.error.message
              : 'No se pudo cancelar'}
          </Alert>
        ) : null}
      </Paper>
    )
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: t => alpha(t.palette.primary.main, 0.04)
      }}
    >
      <Stack spacing={1.25}>
        <Typography variant="subtitle1" fontWeight={700}>
          Solicitar unirse
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Envía una solicitud al capitán de {teamName}. Si la aceptan, pasarás a
          ser miembro del equipo.
        </Typography>
        <Button
          variant="contained"
          disabled={requestJoin.isPending}
          onClick={() => void requestJoin.mutateAsync()}
          sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
        >
          {requestJoin.isPending ? 'Enviando…' : 'Solicitar unirse'}
        </Button>
        {requestJoin.isError ? (
          <Alert severity="error">
            {requestJoin.error instanceof Error
              ? requestJoin.error.message
              : 'No se pudo enviar la solicitud'}
          </Alert>
        ) : null}
        {requestJoin.isSuccess ? (
          <Alert severity="success">Solicitud enviada correctamente.</Alert>
        ) : null}
      </Stack>
    </Paper>
  )
}
