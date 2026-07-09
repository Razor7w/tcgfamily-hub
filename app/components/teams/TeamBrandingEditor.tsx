'use client'

import { useRef, useState } from 'react'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'
import TeamHeaderIdentityRow from '@/components/teams/TeamHeaderIdentityRow'
import {
  TeamHeaderAvatar,
  TeamHeaderCover,
  TeamHeaderIdentityContent
} from '@/components/teams/team-header-ui'
import { useUpdateTeam } from '@/hooks/useTeams'

type Kind = 'logo' | 'cover'

async function uploadTeamBrandingFile(teamId: string, file: File) {
  const contentType =
    file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg'
  const pres = await fetch('/api/r2/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder: 'team-branding',
      teamId,
      filename: file.name || 'image.jpg',
      contentType
    })
  })
  const pre = await pres.json()
  if (!pres.ok) {
    throw new Error(
      typeof pre?.error === 'string' ? pre.error : 'Presign falló'
    )
  }
  const { uploadUrl, key, publicUrl } = pre as {
    uploadUrl: string
    key: string
    publicUrl: string
  }
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file
  })
  if (!put.ok) throw new Error('No se pudo subir la imagen')
  return { publicUrl, key }
}

const coverActionSx: SxProps<Theme> = {
  bgcolor: t => alpha(t.palette.background.paper, 0.94),
  color: 'text.primary',
  backdropFilter: 'blur(8px)',
  border: '1px solid',
  borderColor: t => alpha(t.palette.text.primary, 0.1),
  boxShadow: t => `0 4px 16px ${alpha(t.palette.common.black, 0.12)}`,
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    bgcolor: t => alpha(t.palette.background.paper, 0.98),
    transform: 'translateY(-1px)',
    boxShadow: t => `0 6px 20px ${alpha(t.palette.common.black, 0.14)}`
  },
  '&:active': {
    transform: 'translateY(0)'
  }
}

type Props = {
  teamId: string
  teamSlug: string
  teamName: string
  teamBio?: string
  memberCount?: number
  logoUrl: string
  coverUrl: string
}

export default function TeamBrandingEditor({
  teamId,
  teamSlug,
  teamName,
  teamBio = '',
  memberCount = 0,
  logoUrl,
  coverUrl
}: Props) {
  const updateTeam = useUpdateTeam(teamSlug)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<Kind | 'clear-logo' | 'clear-cover' | null>(
    null
  )
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function applyUpload(kind: Kind, file: File) {
    setErr(null)
    setMsg(null)
    setBusy(kind)
    try {
      const { publicUrl, key } = await uploadTeamBrandingFile(teamId, file)
      if (kind === 'logo') {
        await updateTeam.mutateAsync({ logoUrl: publicUrl, logoKey: key })
        setMsg('Logo actualizado.')
      } else {
        await updateTeam.mutateAsync({ coverUrl: publicUrl, coverKey: key })
        setMsg('Portada actualizada.')
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al subir')
    } finally {
      setBusy(null)
    }
  }

  async function clearAsset(kind: 'logo' | 'cover') {
    setErr(null)
    setMsg(null)
    setBusy(kind === 'logo' ? 'clear-logo' : 'clear-cover')
    try {
      if (kind === 'logo') {
        await updateTeam.mutateAsync({ logoUrl: '', logoKey: '' })
        setMsg('Logo quitado.')
      } else {
        await updateTeam.mutateAsync({ coverUrl: '', coverKey: '' })
        setMsg('Portada quitada.')
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al quitar')
    } finally {
      setBusy(null)
    }
  }

  const isBusy = busy != null

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 0,
        borderRadius: 3,
        overflow: 'hidden',
        borderColor: t => alpha(t.palette.text.primary, 0.1)
      }}
    >
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
        <Typography
          variant="subtitle1"
          fontWeight={700}
          letterSpacing="-0.02em"
        >
          Imagen del equipo
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.25, lineHeight: 1.6 }}
        >
          Portada y logo visibles en la página pública (estilo perfil).
        </Typography>
      </Box>

      <Box sx={{ position: 'relative', mt: 1.5 }}>
        <TeamHeaderCover coverUrl={coverUrl} rounded />

        <Stack
          direction="row"
          spacing={1}
          sx={{ position: 'absolute', top: 20, right: 36, zIndex: 3 }}
        >
          <Button
            size="small"
            variant="contained"
            disableElevation
            startIcon={
              busy === 'cover' ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <PhotoCameraOutlinedIcon fontSize="small" />
              )
            }
            disabled={isBusy}
            onClick={() => coverInputRef.current?.click()}
            sx={coverActionSx}
          >
            Portada
          </Button>
          {coverUrl ? (
            <Button
              size="small"
              variant="outlined"
              disableElevation
              disabled={isBusy}
              onClick={() => void clearAsset('cover')}
              sx={coverActionSx}
            >
              Quitar
            </Button>
          ) : null}
        </Stack>

        <Box sx={{ px: 2.5, pb: 2.5 }}>
          <TeamHeaderIdentityRow
            avatar={
              <TeamHeaderAvatar
                name={teamName}
                logoUrl={logoUrl}
                adornment={
                  <Button
                    size="small"
                    variant="contained"
                    aria-label="Cambiar logo"
                    disabled={isBusy}
                    onClick={() => logoInputRef.current?.click()}
                    sx={{
                      position: 'absolute',
                      right: -2,
                      bottom: -2,
                      minWidth: 0,
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      p: 0,
                      border: '3px solid',
                      borderColor: 'background.paper',
                      boxShadow: t =>
                        `0 4px 12px ${alpha(t.palette.primary.dark, 0.28)}`,
                      transition: 'transform 0.2s ease',
                      '&:hover': { transform: 'scale(1.04)' },
                      '&:active': { transform: 'scale(0.98)' }
                    }}
                  >
                    {busy === 'logo' ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <PhotoCameraOutlinedIcon sx={{ fontSize: 18 }} />
                    )}
                  </Button>
                }
              />
            }
          >
            <TeamHeaderIdentityContent
              name={teamName}
              memberCount={memberCount}
              bio={teamBio}
              footer={
                logoUrl ? (
                  <Button
                    size="small"
                    color="inherit"
                    disabled={isBusy}
                    onClick={() => void clearAsset('logo')}
                    sx={{
                      mt: 1.25,
                      px: 0,
                      minWidth: 0,
                      textTransform: 'none',
                      fontWeight: 500,
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'text.primary',
                        bgcolor: 'transparent'
                      }
                    }}
                  >
                    Quitar logo
                  </Button>
                ) : null
              }
            />
          </TeamHeaderIdentityRow>
        </Box>
      </Box>

      {msg ? (
        <Alert severity="success" sx={{ mx: 2.5, mb: 2, borderRadius: 2 }}>
          {msg}
        </Alert>
      ) : null}
      {err ? (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2, borderRadius: 2 }}>
          {err}
        </Alert>
      ) : null}

      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void applyUpload('logo', f)
        }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void applyUpload('cover', f)
        }}
      />
    </Paper>
  )
}
