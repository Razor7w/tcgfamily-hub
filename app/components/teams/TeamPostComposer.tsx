'use client'

import { useMemo, useRef, useState } from 'react'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import TeamPostRichTextEditor from '@/components/teams/TeamPostRichTextEditor'
import { useCreateTeamPost, useUpdateTeamPost } from '@/hooks/useTeamPosts'
import { useSavedDecklistsList } from '@/hooks/useSavedDecklists'
import type { TeamPostDTO } from '@/lib/teams/post-payload'
import {
  TEAM_POST_TITLE_MAX,
  type TeamPostVisibility
} from '@/lib/teams/post-constants'
import { teamPostBodyIsEmpty } from '@/lib/teams/post-text'

async function uploadPostCover(teamId: string, file: File) {
  const contentType =
    file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg'
  const pres = await fetch('/api/r2/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder: 'team-posts',
      teamId,
      filename: file.name || 'cover.jpg',
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
  if (!put.ok) throw new Error('No se pudo subir la portada')
  return { publicUrl, key }
}

const emptyForm = () => ({
  title: '',
  bodyHtml: '',
  coverUrl: '',
  coverKey: '',
  decklistId: '',
  visibility: 'public' as TeamPostVisibility
})

function postToForm(post: TeamPostDTO) {
  return {
    title: post.title,
    bodyHtml: post.bodyHtml,
    coverUrl: post.coverUrl,
    coverKey: post.coverKey ?? '',
    decklistId: post.decklistId ?? post.decklist?.id ?? '',
    visibility: post.visibility
  }
}

type Props = {
  teamId: string
  teamSlug: string
  editPost?: TeamPostDTO | null
  onSuccess?: () => void
  onCancel?: () => void
}

export default function TeamPostComposer({
  teamId,
  teamSlug,
  editPost = null,
  onSuccess,
  onCancel
}: Props) {
  const isEditing = editPost != null
  const createPost = useCreateTeamPost(teamSlug)
  const updatePost = useUpdateTeamPost(teamSlug)
  const isPending = createPost.isPending || updatePost.isPending
  const { data: decklists, isPending: decksPending } = useSavedDecklistsList()
  const publicDecks = useMemo(
    () => (decklists ?? []).filter(d => d.isPublic),
    [decklists]
  )

  const coverInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState(() =>
    editPost ? postToForm(editPost) : emptyForm()
  )
  const [coverBusy, setCoverBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleCover(file: File) {
    setCoverBusy(true)
    setErr(null)
    try {
      const uploaded = await uploadPostCover(teamId, file)
      setForm(prev => ({
        ...prev,
        coverUrl: uploaded.publicUrl,
        coverKey: uploaded.key
      }))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al subir portada')
    } finally {
      setCoverBusy(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (teamPostBodyIsEmpty(form.bodyHtml)) {
      setErr('Escribe el contenido de la publicación')
      return
    }
    try {
      const payload = {
        title: form.title.trim() || undefined,
        bodyHtml: form.bodyHtml,
        coverUrl: form.coverUrl,
        coverKey: form.coverKey,
        decklistId: form.decklistId || null,
        visibility: form.visibility
      }
      if (isEditing && editPost) {
        await updatePost.mutateAsync({ postId: editPost.id, ...payload })
      } else {
        await createPost.mutateAsync({
          ...payload,
          coverUrl: form.coverUrl || undefined,
          coverKey: form.coverKey || undefined
        })
        setForm(emptyForm())
      }
      onSuccess?.()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al publicar')
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {isEditing
          ? 'Actualiza el contenido, la visibilidad o los recursos vinculados.'
          : 'Comparte novedades, resultados o estrategia con tu equipo.'}
      </Typography>

      <Stack spacing={2}>
        <TextField
          label="Título (opcional)"
          value={form.title}
          onChange={e =>
            setForm(prev => ({
              ...prev,
              title: e.target.value.slice(0, TEAM_POST_TITLE_MAX)
            }))
          }
          fullWidth
        />

        <TeamPostRichTextEditor
          value={form.bodyHtml}
          onChange={bodyHtml => setForm(prev => ({ ...prev, bodyHtml }))}
        />

        <Box>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Visibilidad
          </Typography>
          <RadioGroup
            value={form.visibility}
            onChange={e =>
              setForm(prev => ({
                ...prev,
                visibility: e.target.value as TeamPostVisibility
              }))
            }
          >
            <FormControlLabel
              value="public"
              control={<Radio size="small" />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Pública
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Visible en la página pública del equipo.
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', ml: 0, mb: 0.5 }}
            />
            <FormControlLabel
              value="members_only"
              control={<Radio size="small" />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Solo miembros
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Solo el equipo la ve en el panel de gestión.
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', ml: 0 }}
            />
          </RadioGroup>
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Portada (opcional)
          </Typography>
          {form.coverUrl ? (
            <Box sx={{ position: 'relative', mb: 1 }}>
              <Box
                component="img"
                src={form.coverUrl}
                alt=""
                sx={{
                  width: '100%',
                  maxHeight: 220,
                  objectFit: 'cover',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              />
              <Button
                size="small"
                color="inherit"
                onClick={() =>
                  setForm(prev => ({ ...prev, coverUrl: '', coverKey: '' }))
                }
                sx={{ mt: 0.5, px: 0, textTransform: 'none' }}
              >
                Quitar portada
              </Button>
            </Box>
          ) : (
            <Button
              variant="outlined"
              startIcon={
                coverBusy ? (
                  <CircularProgress size={16} />
                ) : (
                  <PhotoCameraOutlinedIcon />
                )
              }
              disabled={coverBusy}
              onClick={() => coverInputRef.current?.click()}
            >
              Subir imagen de portada
            </Button>
          )}
        </Box>

        <FormControl fullWidth disabled={decksPending}>
          <InputLabel id="team-post-deck-label">
            Mazo vinculado (opcional)
          </InputLabel>
          <Select
            labelId="team-post-deck-label"
            label="Mazo vinculado (opcional)"
            value={form.decklistId}
            onChange={e =>
              setForm(prev => ({ ...prev, decklistId: e.target.value }))
            }
          >
            <MenuItem value="">
              <em>Sin mazo</em>
            </MenuItem>
            {publicDecks.map(d => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {publicDecks.length === 0 && !decksPending ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Marca un mazo como público en Mazos para poder vincularlo.
          </Alert>
        ) : null}

        {err ? <Alert severity="error">{err}</Alert> : null}

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            type="submit"
            variant="contained"
            disabled={isPending}
            sx={{
              boxShadow: t =>
                `0 8px 24px ${alpha(t.palette.primary.main, 0.22)}`
            }}
          >
            {isPending
              ? isEditing
                ? 'Guardando…'
                : 'Publicando…'
              : isEditing
                ? 'Guardar cambios'
                : 'Publicar'}
          </Button>
          {onCancel ? (
            <Button type="button" color="inherit" onClick={onCancel}>
              Cancelar
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void handleCover(f)
        }}
      />
    </Box>
  )
}
