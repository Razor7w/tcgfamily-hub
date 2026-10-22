'use client'

import { useMemo, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined'
import { useSession } from 'next-auth/react'
import { AdminStorePageHeading } from '@/components/admin/AdminStorePageHeading'
import {
  useCreateShiftNote,
  useDeleteShiftNote,
  useShiftNotes,
  useUpdateShiftNote
} from '@/hooks/useShiftNotes'
import { useMeStores } from '@/hooks/useMeStores'
import {
  SHIFT_NOTE_BODY_MAX,
  SHIFT_NOTE_IMAGE_MAX_MB,
  type ShiftNoteDto
} from '@/lib/shift-note'
import { isTcgFamilyStoreSlug } from '@/lib/store-points-clp'

function formatWhen(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function uploadNoteImage(file: File): Promise<string> {
  const presignRes = await fetch('/api/r2/presign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      folder: 'uploads'
    })
  })
  const presignJson = (await presignRes.json().catch(() => null)) as {
    uploadUrl?: string
    publicUrl?: string
    error?: string
  } | null
  if (!presignRes.ok || !presignJson?.uploadUrl || !presignJson.publicUrl) {
    throw new Error(presignJson?.error || 'No se pudo preparar la imagen.')
  }
  const putRes = await fetch(presignJson.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file
  })
  if (!putRes.ok) {
    throw new Error('La imagen no se pudo subir.')
  }
  return presignJson.publicUrl
}

function NoteCard({
  note,
  busy,
  onResolve,
  onDelete,
  onOpenImage
}: {
  note: ShiftNoteDto
  busy: boolean
  onResolve: (resolved: boolean) => void
  onDelete: () => void
  onOpenImage: (url: string) => void
}) {
  const done = note.status === 'done'
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {note.authorName}
            {' · '}
            {formatWhen(note.createdAt)}
            {done && note.resolvedByName
              ? ` · Atendida por ${note.resolvedByName}`
              : ''}
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.55
            }}
          >
            {note.body}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button
              size="small"
              variant={done ? 'text' : 'contained'}
              disabled={busy}
              onClick={() => onResolve(!done)}
            >
              {done ? 'Reabrir' : 'Atendida'}
            </Button>
            <Button
              size="small"
              color="inherit"
              disabled={busy}
              onClick={onDelete}
            >
              Eliminar
            </Button>
          </Stack>
        </Box>
        {note.imageUrl ? (
          <Box
            component="button"
            type="button"
            onClick={() => onOpenImage(note.imageUrl!)}
            sx={{
              p: 0,
              border: 0,
              bgcolor: 'transparent',
              cursor: 'pointer',
              borderRadius: 1.5,
              overflow: 'hidden',
              flexShrink: 0,
              width: 96,
              height: 96
            }}
          >
            <Box
              component="img"
              src={note.imageUrl}
              alt=""
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default function AdminNotasClient() {
  const { data: session, status } = useSession()
  const { data: meStores } = useMeStores()
  const isStaff =
    session?.user?.storeRole === 'owner' ||
    session?.user?.storeRole === 'store_admin'
  const isTcgFamily = useMemo(() => {
    const aid = session?.user?.activeStoreId?.trim() ?? ''
    if (!aid) return false
    const hit = (meStores?.stores ?? []).find(row => row.id === aid)
    return isTcgFamilyStoreSlug(hit?.slug)
  }, [meStores?.stores, session?.user?.activeStoreId])

  const notesQuery = useShiftNotes(
    status === 'authenticated' && isStaff && isTcgFamily
  )
  const createNote = useCreateShiftNote()
  const updateNote = useUpdateShiftNote()
  const deleteNote = useDeleteShiftNote()

  const fileRef = useRef<HTMLInputElement | null>(null)
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)

  const openNotes = notesQuery.data?.open ?? []
  const doneNotes = notesQuery.data?.done ?? []
  const saving = createNote.isPending || uploading
  const mutatingId = updateNote.isPending
    ? (updateNote.variables?.id ?? '')
    : deleteNote.isPending
      ? (deleteNote.variables ?? '')
      : ''

  async function onPickImage(file: File | undefined) {
    if (!file) return
    setFormError('')
    if (!file.type.startsWith('image/')) {
      setFormError('Selecciona una imagen.')
      return
    }
    if (file.size > SHIFT_NOTE_IMAGE_MAX_MB * 1024 * 1024) {
      setFormError(`La imagen supera ${SHIFT_NOTE_IMAGE_MAX_MB} MB.`)
      return
    }
    setUploading(true)
    try {
      const url = await uploadNoteImage(file)
      setImageUrl(url)
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'No se pudo subir la imagen.'
      )
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit() {
    setFormError('')
    const text = body.trim()
    if (!text) {
      setFormError('Escribe la nota antes de publicarla.')
      return
    }
    if (text.length > SHIFT_NOTE_BODY_MAX) {
      setFormError(`La nota admite hasta ${SHIFT_NOTE_BODY_MAX} caracteres.`)
      return
    }
    try {
      await createNote.mutateAsync({
        body: text,
        imageUrl: imageUrl || null
      })
      setBody('')
      setImageUrl('')
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'No se pudo guardar la nota.'
      )
    }
  }

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        py: 4,
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.05)} 0%, ${t.palette.background.default} 42%)`
      })}
    >
      <Container maxWidth="md">
        <AdminStorePageHeading showActiveStoreAvatar={false}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: t => alpha(t.palette.primary.main, 0.1),
                color: 'primary.main',
                flexShrink: 0
              }}
            >
              <StickyNote2OutlinedIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
                Notas
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75, maxWidth: 560, lineHeight: 1.6 }}
              >
                Avisos para el turno que sigue en TCG Family. Una nota queda
                pendiente hasta que alguien la marca como atendida.
              </Typography>
            </Box>
          </Stack>
        </AdminStorePageHeading>

        <Box sx={{ mt: 3 }}>
          {status === 'authenticated' && (!isStaff || !isTcgFamily) ? (
            <Alert severity="warning">
              Las notas solo están disponibles para el staff de TCG Family.
            </Alert>
          ) : (
            <Stack spacing={3}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                  <TextField
                    label="Nota para el siguiente turno"
                    value={body}
                    onChange={event => setBody(event.target.value)}
                    multiline
                    minRows={3}
                    fullWidth
                    inputProps={{ maxLength: SHIFT_NOTE_BODY_MAX }}
                    helperText={`${body.trim().length}/${SHIFT_NOTE_BODY_MAX}`}
                  />
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ mt: 2, flexWrap: 'wrap' }}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      hidden
                      onChange={event => {
                        const file = event.target.files?.[0]
                        event.target.value = ''
                        void onPickImage(file)
                      }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={
                        uploading ? (
                          <CircularProgress size={16} />
                        ) : (
                          <ImageOutlinedIcon />
                        )
                      }
                      disabled={saving}
                      onClick={() => fileRef.current?.click()}
                    >
                      {imageUrl ? 'Cambiar imagen' : 'Adjuntar imagen'}
                    </Button>
                    <Button
                      variant="contained"
                      disabled={saving || !body.trim()}
                      onClick={() => void onSubmit()}
                    >
                      Dejar nota
                    </Button>
                  </Stack>
                  {imageUrl ? (
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ mt: 2 }}
                    >
                      <Box
                        component="img"
                        src={imageUrl}
                        alt=""
                        sx={{
                          width: 72,
                          height: 72,
                          objectFit: 'cover',
                          borderRadius: 1.5
                        }}
                      />
                      <Button
                        size="small"
                        color="inherit"
                        disabled={saving}
                        onClick={() => setImageUrl('')}
                      >
                        Quitar imagen
                      </Button>
                    </Stack>
                  ) : null}
                  {formError ? (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {formError}
                    </Alert>
                  ) : null}
                  {createNote.isError && !formError ? (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {createNote.error instanceof Error
                        ? createNote.error.message
                        : 'No se pudo guardar la nota.'}
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>

              {notesQuery.isPending ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : notesQuery.isError ? (
                <Alert
                  severity="error"
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => void notesQuery.refetch()}
                    >
                      Reintentar
                    </Button>
                  }
                >
                  {notesQuery.error instanceof Error
                    ? notesQuery.error.message
                    : 'Error al cargar'}
                </Alert>
              ) : (
                <>
                  <Box>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      sx={{ mb: 1.5 }}
                    >
                      Pendientes ({openNotes.length})
                    </Typography>
                    {openNotes.length === 0 ? (
                      <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent sx={{ py: 4, textAlign: 'center' }}>
                          <Typography color="text.secondary">
                            No hay notas pendientes. El turno siguiente no tiene
                            avisos.
                          </Typography>
                        </CardContent>
                      </Card>
                    ) : (
                      <Stack spacing={1.5}>
                        {openNotes.map(note => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            busy={mutatingId === note.id}
                            onResolve={resolved =>
                              updateNote.mutate({ id: note.id, resolved })
                            }
                            onDelete={() => deleteNote.mutate(note.id)}
                            onOpenImage={setPreviewUrl}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>

                  <Box>
                    <Button
                      color="inherit"
                      onClick={() => setShowDone(value => !value)}
                    >
                      {showDone
                        ? 'Ocultar atendidas'
                        : `Ver atendidas (${doneNotes.length})`}
                    </Button>
                    {showDone ? (
                      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                        {doneNotes.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            Todavía no hay notas atendidas.
                          </Typography>
                        ) : (
                          doneNotes.map(note => (
                            <NoteCard
                              key={note.id}
                              note={note}
                              busy={mutatingId === note.id}
                              onResolve={resolved =>
                                updateNote.mutate({ id: note.id, resolved })
                              }
                              onDelete={() => deleteNote.mutate(note.id)}
                              onOpenImage={setPreviewUrl}
                            />
                          ))
                        )}
                      </Stack>
                    ) : null}
                  </Box>
                </>
              )}
            </Stack>
          )}
        </Box>
      </Container>

      <Dialog
        open={Boolean(previewUrl)}
        onClose={() => setPreviewUrl(null)}
        maxWidth="md"
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            aria-label="Cerrar"
            onClick={() => setPreviewUrl(null)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'background.paper'
            }}
          >
            <CloseIcon />
          </IconButton>
          {previewUrl ? (
            <Box
              component="img"
              src={previewUrl}
              alt=""
              sx={{ display: 'block', maxWidth: '100%', maxHeight: '80dvh' }}
            />
          ) : null}
        </Box>
      </Dialog>
    </Box>
  )
}
