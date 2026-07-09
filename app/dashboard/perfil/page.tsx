'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import Avatar from '@mui/material/Avatar'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Drawer from '@mui/material/Drawer'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import {
  getPasswordRuleChecks,
  isPasswordStrengthSatisfied,
  validateRegisterName
} from '@/lib/password-rules'
import { validatePopidOptional } from '@/lib/rut-chile'
import { onlyDigits } from '@/lib/rut-input'
import CheckCircle from '@mui/icons-material/CheckCircle'
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked'
import R2UppyProfileImageUploader from '@/components/r2/R2UppyProfileImageUploader'
import ButtonBarCode from '@/components/molecule/ButtonBarCode'
import ChampionshipPointsCard from '@/components/dashboard/ChampionshipPointsCard'
import PlayPokemonRankChip from '@/components/play-pokemon/PlayPokemonRankChip'
import { meProfileQueryKey, useMe, type MeProfile } from '@/hooks/useMe'
import { useMeStores } from '@/hooks/useMeStores'
import { useMyChampionshipPoints } from '@/hooks/useMyChampionshipPoints'

type StoreOption = { id: string; name: string }

export default function PerfilPage() {
  const { data: session, status, update } = useSession()
  const queryClient = useQueryClient()
  const userId = session?.user?.id ? String(session.user.id) : ''
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), {
    noSsr: true,
    defaultMatches: false
  })
  const {
    data: me,
    isPending: mePending,
    isError: meError,
    error: meQueryError
  } = useMe()
  const { data: championshipPoints } = useMyChampionshipPoints()

  const showPublicRankChip =
    championshipPoints?.found === true &&
    championshipPoints.rankPublic === true &&
    typeof championshipPoints.rank === 'number' &&
    typeof championshipPoints.primaryPointTotal === 'number'

  const [name, setName] = useState('')
  const [popid, setPopid] = useState('')
  const [defaultStoreId, setDefaultStoreId] = useState('')
  const {
    data: meStoresPayload,
    isPending: storesQueryPending,
    isError: storesQueryError
  } = useMeStores()
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [profileErr, setProfileErr] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [savingImage, setSavingImage] = useState(false)
  const [imageOpen, setImageOpen] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNew, setConfirmNew] = useState('')
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwMsg, setPwMsg] = useState<string | null>(null)
  const [pwErr, setPwErr] = useState<string | null>(null)
  const [savingPw, setSavingPw] = useState(false)

  const formHydratedForUser = useRef<string | null>(null)
  useEffect(() => {
    if (!me) return
    if (formHydratedForUser.current === me.id) return
    formHydratedForUser.current = me.id
    setName(me.name)
    setPopid(me.popid)
    setDefaultStoreId(me.defaultStoreId?.trim() ?? '')
  }, [me])

  const storeOptions = useMemo((): StoreOption[] => {
    const rows = meStoresPayload?.stores ?? []
    return rows
      .map(r => ({
        id: String(r.id ?? '').trim(),
        name: String(r.name ?? '').trim()
      }))
      .filter(r => r.id)
  }, [meStoresPayload?.stores])

  const storesLoading =
    status === 'authenticated' && storesQueryPending && !storesQueryError
  /** Siempre una tienda de la lista: corrige vacío / guardado inválido. */
  useEffect(() => {
    if (storeOptions.length === 0) return
    const ids = new Set(storeOptions.map(s => s.id))
    setDefaultStoreId(prev => {
      const saved = (me?.defaultStoreId ?? '').trim()
      if (saved && ids.has(saved)) return saved
      const cur = prev.trim()
      if (cur && ids.has(cur)) return prev
      return storeOptions[0]!.id
    })
  }, [me?.defaultStoreId, storeOptions])

  const newPwChecks = useMemo(
    () => getPasswordRuleChecks(newPassword),
    [newPassword]
  )
  const newPwOk = useMemo(
    () => isPasswordStrengthSatisfied(newPassword),
    [newPassword]
  )
  const confirmPwOk =
    newPassword.length > 0 &&
    confirmNew.length > 0 &&
    newPassword === confirmNew

  const canSaveProfile = useMemo(() => {
    if (!me || savingProfile) return false
    if (validateRegisterName(name) !== null) return false
    if (validatePopidOptional(popid) !== null) return false
    const sid = defaultStoreId.trim()
    if (
      storeOptions.length > 0 &&
      (!sid || !storeOptions.some(s => s.id === sid))
    ) {
      return false
    }
    const prevDefault = (me.defaultStoreId ?? '').trim()
    const nextDefault = sid
    return (
      name.trim() !== me.name.trim() ||
      popid.trim() !== (me.popid || '').trim() ||
      prevDefault !== nextDefault
    )
  }, [me, name, popid, defaultStoreId, savingProfile, storeOptions])

  const canSavePassword = useMemo(() => {
    if (!me?.hasPassword || savingPw) return false
    if (!currentPassword) return false
    if (!newPwOk || !confirmPwOk) return false
    return true
  }, [me, currentPassword, newPwOk, confirmPwOk, savingPw])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileErr(null)
    setProfileMsg(null)
    const nameErr = validateRegisterName(name)
    if (nameErr) {
      setProfileErr(nameErr)
      return
    }
    const popErr = validatePopidOptional(popid)
    if (popErr) {
      setProfileErr(popErr)
      return
    }
    const sid = defaultStoreId.trim()
    if (
      !sid ||
      (storeOptions.length > 0 && !storeOptions.some(s => s.id === sid))
    ) {
      setProfileErr('Elegí una tienda predeterminada de la lista.')
      return
    }
    setSavingProfile(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          popid,
          defaultStoreId: sid
        })
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        name?: string
        popid?: string
        defaultStoreId?: string | null
      }
      if (!res.ok) {
        setProfileErr(data.error || 'No se pudo guardar.')
        return
      }
      if (userId) {
        queryClient.setQueryData<MeProfile>(meProfileQueryKey(userId), prev =>
          prev
            ? {
                ...prev,
                name: data.name ?? prev.name,
                popid: data.popid ?? prev.popid,
                defaultStoreId:
                  data.defaultStoreId !== undefined
                    ? data.defaultStoreId
                    : prev.defaultStoreId
              }
            : prev
        )
      }
      if (data.defaultStoreId !== undefined) {
        setDefaultStoreId((data.defaultStoreId ?? '').trim())
      }
      setProfileMsg('Datos actualizados.')
      const savedDefault = (data.defaultStoreId ?? sid).trim()
      await update({
        name: data.name ?? name.trim(),
        popid:
          data.popid !== undefined && data.popid !== null
            ? data.popid
            : popid.trim().slice(0, 64),
        ...(savedDefault && /^[a-f0-9]{24}$/i.test(savedDefault)
          ? {
              defaultStoreId: savedDefault,
              activeStoreId: savedDefault
            }
          : {})
      })
    } finally {
      setSavingProfile(false)
    }
  }

  async function saveProfileImage(publicUrl: string, key: string) {
    setProfileErr(null)
    setProfileMsg(null)
    setSavingImage(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: publicUrl, imageKey: key })
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        image?: string
        imageKey?: string
      }
      if (!res.ok) {
        setProfileErr(data.error || 'No se pudo actualizar la foto.')
        return
      }
      if (userId) {
        queryClient.setQueryData<MeProfile>(meProfileQueryKey(userId), prev =>
          prev
            ? {
                ...prev,
                image: data.image ?? publicUrl,
                imageKey: data.imageKey ?? key
              }
            : prev
        )
      }
      setProfileMsg('Foto de perfil actualizada.')
      await update({ picture: data.image ?? publicUrl })
    } finally {
      setSavingImage(false)
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwErr(null)
    setPwMsg(null)
    setSavingPw(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword: confirmNew
        })
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setPwErr(data.error || 'No se pudo cambiar la contraseña.')
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNew('')
      setPwMsg('Contraseña actualizada.')
      await update({ hasPassword: true })
    } finally {
      setSavingPw(false)
    }
  }

  const loadError =
    meError && meQueryError instanceof Error
      ? meQueryError.message
      : meError
        ? 'No se pudo cargar el perfil'
        : null

  if (status === 'loading' || mePending) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!session?.user) {
    return null
  }

  if (loadError || !me) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 2.5, md: 4 } }}>
        <Alert severity="error">{loadError || 'Sin datos'}</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2.5, md: 4 } }}>
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontWeight: 900,
          letterSpacing: '-0.03em',
          textWrap: 'balance'
        }}
        gutterBottom
      >
        Perfil
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: { xs: 2, md: 3 }, maxWidth: '72ch', textWrap: 'pretty' }}
      >
        Modifica tu nombre, Pop ID y tienda predeterminada (si tenés tiendas
        disponibles, tenés que elegir una). El correo y el RUT solo los puede
        cambiar un administrador; aquí siguen visibles.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, md: 2.5 },
          gridTemplateColumns: { xs: '1fr', md: '1.35fr 1fr' },
          alignItems: 'start'
        }}
      >
        <Paper
          component="form"
          onSubmit={saveProfile}
          elevation={2}
          sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}
          >
            Datos personales
          </Typography>
          {profileMsg ? (
            <Alert
              severity="success"
              sx={{ mb: 2 }}
              onClose={() => setProfileMsg(null)}
            >
              {profileMsg}
            </Alert>
          ) : null}
          {profileErr ? (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setProfileErr(null)}
            >
              {profileErr}
            </Alert>
          ) : null}
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
                Foto de perfil
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: 'wrap',
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'action.hover'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Avatar
                    src={me.image || undefined}
                    alt={me.name || 'Usuario'}
                    sx={{ width: 44, height: 44 }}
                  />
                  <Box sx={{ display: 'grid', gap: 0.25 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        flexWrap: 'wrap'
                      }}
                    >
                      <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                        {me.name}
                      </Typography>
                      {showPublicRankChip ? (
                        <PlayPokemonRankChip
                          data={{
                            rank: championshipPoints.rank!,
                            championshipPoints:
                              championshipPoints.primaryPointTotal!,
                            playPoints: championshipPoints.secondaryPointTotal,
                            divisionLabel: championshipPoints.division
                              ? championshipPoints.division === 'masters'
                                ? 'Master'
                                : championshipPoints.division === 'seniors'
                                  ? 'Senior'
                                  : championshipPoints.division === 'juniors'
                                    ? 'Junior'
                                    : championshipPoints.division
                              : undefined,
                            seasonLabel: championshipPoints.seasonLabel,
                            linkedDisplayName:
                              championshipPoints.displayName ??
                              championshipPoints.searchedAs
                          }}
                        />
                      ) : null}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Se verá en el header y tu perfil.
                    </Typography>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  onClick={() => setImageOpen(true)}
                  disabled={savingImage}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 900,
                    alignSelf: { xs: 'stretch', sm: 'center' }
                  }}
                >
                  Cambiar imagen de perfil
                </Button>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }
              }}
            >
              <TextField
                label="Correo electrónico"
                value={me.email}
                disabled
                fullWidth
                helperText="Solo lectura. Contacta a un administrador para cambiarlo."
              />
              <TextField
                label="RUT"
                value={me.rut}
                disabled
                fullWidth
                helperText="Solo lectura. Contacta a un administrador para cambiarlo."
              />
            </Box>

            <ButtonBarCode
              id={me.rut?.trim() ?? ''}
              trigger="button"
              dialogTitle="Código de barras del RUT"
              valueLabel="RUT"
              buttonLabel="Ver código de barras del RUT"
              ariaLabel="Generar código de barras con tu RUT"
              disabled={!me.rut?.trim()}
            />

            <TextField
              label="Nombre"
              name="name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={savingProfile}
              required
              fullWidth
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="Pop ID"
              name="popid"
              value={popid}
              onChange={e => setPopid(onlyDigits(e.target.value, 64))}
              disabled={savingProfile}
              fullWidth
              helperText="Opcional. Solo números."
              error={
                Boolean(popid.trim()) && validatePopidOptional(popid) !== null
              }
              inputProps={{
                maxLength: 64,
                inputMode: 'numeric',
                pattern: '[0-9]*'
              }}
            />
            <FormControl
              fullWidth
              required
              disabled={
                savingProfile || storesLoading || storeOptions.length === 0
              }
            >
              <InputLabel id="perfil-default-store-label">
                Tienda predeterminada
              </InputLabel>
              <Select
                labelId="perfil-default-store-label"
                id="perfil-default-store"
                label="Tienda predeterminada"
                value={defaultStoreId}
                onChange={e =>
                  setDefaultStoreId(String(e.target.value ?? '').trim())
                }
              >
                {storeOptions.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name || s.id}
                  </MenuItem>
                ))}
              </Select>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.75, display: 'block', maxWidth: '72ch' }}
              >
                {storeOptions.length === 0
                  ? 'No hay tiendas disponibles para tu cuenta. Cuando tengas acceso, elegí una aquí.'
                  : 'Obligatoria: se usa al iniciar sesión si no elegiste otra en el encabezado. Solo aparecen tiendas a las que tenés acceso.'}
              </Typography>
            </FormControl>
            <Button
              type="submit"
              variant="contained"
              disabled={!canSaveProfile || savingImage}
              sx={{
                alignSelf: { xs: 'stretch', sm: 'flex-start' },
                textTransform: 'none',
                fontWeight: 900
              }}
            >
              {savingProfile ? 'Guardando…' : 'Guardar datos'}
            </Button>
          </Stack>
        </Paper>

        <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}
          >
            Contraseña
          </Typography>
          {!me.hasPassword ? (
            <Alert severity="info">
              Iniciaste sesión con Google y no tienes contraseña local. Para
              usar correo y contraseña, el administrador puede ayudarte o puedes
              registrarte con correo si aún no tienes cuenta.
            </Alert>
          ) : (
            <Box component="form" onSubmit={savePassword}>
              {pwMsg ? (
                <Alert
                  severity="success"
                  sx={{ mb: 2 }}
                  onClose={() => setPwMsg(null)}
                >
                  {pwMsg}
                </Alert>
              ) : null}
              {pwErr ? (
                <Alert
                  severity="error"
                  sx={{ mb: 2 }}
                  onClose={() => setPwErr(null)}
                >
                  {pwErr}
                </Alert>
              ) : null}
              <Stack spacing={2}>
                <TextField
                  label="Contraseña actual"
                  type={showCur ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  disabled={savingPw}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={
                            showCur
                              ? 'Ocultar contraseña'
                              : 'Mostrar contraseña'
                          }
                          onClick={() => setShowCur(v => !v)}
                          edge="end"
                        >
                          {showCur ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                <TextField
                  label="Nueva contraseña"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  disabled={savingPw}
                  fullWidth
                  inputProps={{ maxLength: 128 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={
                            showNew
                              ? 'Ocultar contraseña'
                              : 'Mostrar contraseña'
                          }
                          onClick={() => setShowNew(v => !v)}
                          edge="end"
                        >
                          {showNew ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                <Box
                  sx={{
                    pl: 0.5,
                    py: 1,
                    px: 1.5,
                    borderRadius: 1,
                    bgcolor: 'action.hover'
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Requisitos de la nueva contraseña
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
                    {newPwChecks.map(rule => (
                      <Box
                        key={rule.key}
                        component="li"
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1,
                          py: 0.35
                        }}
                      >
                        {rule.ok ? (
                          <CheckCircle
                            sx={{
                              fontSize: 20,
                              mt: '2px',
                              color: 'success.main'
                            }}
                          />
                        ) : (
                          <RadioButtonUnchecked
                            sx={{
                              fontSize: 20,
                              mt: '2px',
                              color: 'action.disabled'
                            }}
                          />
                        )}
                        <Typography
                          component="span"
                          variant="body2"
                          color={rule.ok ? 'success.dark' : 'text.secondary'}
                        >
                          {rule.label}
                        </Typography>
                      </Box>
                    ))}
                    <Box
                      component="li"
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                        py: 0.35
                      }}
                    >
                      {confirmPwOk ? (
                        <CheckCircle
                          sx={{
                            fontSize: 20,
                            mt: '2px',
                            color: 'success.main'
                          }}
                        />
                      ) : (
                        <RadioButtonUnchecked
                          sx={{
                            fontSize: 20,
                            mt: '2px',
                            color: 'action.disabled'
                          }}
                        />
                      )}
                      <Typography
                        component="span"
                        variant="body2"
                        color={confirmPwOk ? 'success.dark' : 'text.secondary'}
                      >
                        La confirmación coincide con la nueva contraseña
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <TextField
                  label="Confirmar nueva contraseña"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmNew}
                  onChange={e => setConfirmNew(e.target.value)}
                  disabled={savingPw}
                  fullWidth
                  inputProps={{ maxLength: 128 }}
                />
                <Divider />
                <Button
                  type="submit"
                  variant="outlined"
                  disabled={!canSavePassword}
                  sx={{
                    alignSelf: { xs: 'stretch', sm: 'flex-start' },
                    textTransform: 'none',
                    fontWeight: 900
                  }}
                >
                  {savingPw ? 'Actualizando…' : 'Actualizar contraseña'}
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>
      </Box>

      <Box sx={{ mt: { xs: 2, md: 2.5 } }}>
        <ChampionshipPointsCard variant="profile" />
      </Box>

      <Dialog
        open={imageOpen && !isMobile}
        onClose={() => setImageOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          {me ? (
            <R2UppyProfileImageUploader
              name={me.name}
              currentImageUrl={me.image || ''}
              maxSizeMb={2}
              onUploaded={async (publicUrl, key) => {
                await saveProfileImage(publicUrl, key)
                setImageOpen(false)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Drawer
        anchor="bottom"
        open={imageOpen && isMobile}
        onClose={() => setImageOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '92dvh'
          }
        }}
      >
        <Box sx={{ p: 2, pt: 1.5 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: '-0.02em', mb: 1 }}>
            Cambiar imagen de perfil
          </Typography>
          {me ? (
            <R2UppyProfileImageUploader
              name={me.name}
              currentImageUrl={me.image || ''}
              maxSizeMb={2}
              onUploaded={async (publicUrl, key) => {
                await saveProfileImage(publicUrl, key)
                setImageOpen(false)
              }}
            />
          ) : null}
          <Box sx={{ height: 12 }} />
        </Box>
      </Drawer>
    </Container>
  )
}
