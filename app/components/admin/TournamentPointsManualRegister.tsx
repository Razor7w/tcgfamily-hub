'use client'

import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Collapse,
  FormControlLabel,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { ExpandLess, ExpandMore, PersonAdd } from '@mui/icons-material'
import { normalizeStorePointsAmount } from '@/lib/store-points-amount'
import { useRegisterTournamentPointsPlayer } from '@/hooks/useTournamentPoints'

export default function TournamentPointsManualRegister() {
  const [open, setOpen] = useState(false)
  const [popId, setPopId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [points, setPoints] = useState('')
  const [applyBalance, setApplyBalance] = useState(true)
  const register = useRegisterTournamentPointsPlayer()

  const pointsNum = normalizeStorePointsAmount(points)
  const canSubmit =
    popId.trim().length > 0 &&
    displayName.trim().length > 0 &&
    pointsNum > 0 &&
    !register.isPending

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    await register.mutateAsync({
      popId: popId.trim(),
      displayName: displayName.trim(),
      points: pointsNum,
      applyBalance
    })
    setPopId('')
    setDisplayName('')
    setPoints('')
  }

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden'
      }}
    >
      <Button
        fullWidth
        onClick={() => setOpen(v => !v)}
        endIcon={open ? <ExpandLess /> : <ExpandMore />}
        sx={{
          justifyContent: 'space-between',
          px: 2,
          py: 1.25,
          borderRadius: 0,
          textTransform: 'none',
          color: 'text.primary'
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <PersonAdd fontSize="small" color="primary" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Registrar jugador manualmente
          </Typography>
        </Stack>
      </Button>

      <Collapse in={open}>
        <Stack
          component="form"
          spacing={2}
          onSubmit={e => void onSubmit(e)}
          sx={{ px: 2, pb: 2, pt: 0 }}
        >
          <Typography variant="body2" color="text.secondary">
            Alta individual con POP ID, nombre y puntos. Se guarda en{' '}
            <strong>Ajuste manual</strong>. Si el POP coincide con un usuario de
            la app, puedes acreditar su saldo de tienda.
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            useFlexGap
          >
            <TextField
              size="small"
              label="POP ID"
              value={popId}
              onChange={e => setPopId(e.target.value)}
              required
              inputProps={{ maxLength: 32 }}
              sx={{ flex: { sm: '0 0 160px' } }}
            />
            <TextField
              size="small"
              label="Nombre"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              fullWidth
              inputProps={{ maxLength: 200 }}
            />
            <TextField
              size="small"
              label="Puntos"
              type="number"
              value={points}
              onChange={e => setPoints(e.target.value)}
              required
              inputProps={{ min: 0.1, step: 0.1 }}
              sx={{ flex: { sm: '0 0 120px' } }}
            />
          </Stack>

          <FormControlLabel
            control={
              <Checkbox
                checked={applyBalance}
                onChange={e => setApplyBalance(e.target.checked)}
              />
            }
            label="Acreditar saldo en la app si el POP tiene cuenta vinculada"
          />

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              type="submit"
              variant="contained"
              disabled={!canSubmit}
              startIcon={<PersonAdd />}
            >
              {register.isPending ? 'Registrando…' : 'Registrar jugador'}
            </Button>
          </Stack>

          {register.isError ? (
            <Alert severity="error">
              {register.error instanceof Error
                ? register.error.message
                : 'Error al registrar'}
            </Alert>
          ) : null}

          {register.isSuccess ? (
            <Alert severity="success" onClose={() => register.reset()}>
              <strong>{register.data?.displayName}</strong> (
              {register.data?.popId}) registrado con{' '}
              <strong>{register.data?.points}</strong> pts
              {register.data?.userLinked
                ? register.data?.credited
                  ? ' · saldo acreditado en la app'
                  : ' · cuenta vinculada (sin acreditar saldo)'
                : ' · sin cuenta en la app'}
              {(register.data?.skippedNoUser ?? 0) > 0
                ? ` · aviso: ${register.data?.skippedNoUser} sin wallet`
                : ''}
              .
            </Alert>
          ) : null}
        </Stack>
      </Collapse>
    </Box>
  )
}
