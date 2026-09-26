'use client'

import { useState } from 'react'
import Link from 'next/link'
import AddIcon from '@mui/icons-material/Add'
import ContentCopy from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import OpenInNew from '@mui/icons-material/OpenInNew'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import {
  useCardBindersList,
  useCreateCardBinder,
  useDeleteCardBinder
} from '@/hooks/useCardBinders'
import {
  CARD_BINDER_NAME_MAX,
  CARD_BINDER_SLUG_MAX
} from '@/lib/card-binder-constants'
import {
  isValidCardBinderSlug,
  normalizeCardBinderSlug,
  slugFromCardBinderName
} from '@/lib/card-binder-slug'
import type { CardBinderDTO } from '@/lib/card-single-dto'

export default function CarpetasPage() {
  const { data: binders, isPending, error } = useCardBindersList()
  const createBinder = useCreateCardBinder()
  const deleteBinder = useDeleteCardBinder()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<CardBinderDTO | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const suggestedSlug = slugFromCardBinderName(name)
  const slugFieldValue = slugTouched ? slug : suggestedSlug

  const handleCreate = async () => {
    setFormError(null)
    const n = name.trim()
    if (!n) {
      setFormError('Escribe un nombre')
      return
    }
    const fromName = slugFromCardBinderName(n)
    const s = normalizeCardBinderSlug(
      (slugTouched ? slug : fromName).trim() || fromName
    )
    if (!isValidCardBinderSlug(s)) {
      setFormError(
        'Slug inválido. Usa 3–48 caracteres: minúsculas, números y guiones (ej. full-art).'
      )
      return
    }
    setSlugTouched(true)
    setSlug(s)
    try {
      await createBinder.mutateAsync({
        name: n,
        slug: s,
        description: description.trim()
      })
      setCreateOpen(false)
      setName('')
      setSlug('')
      setSlugTouched(false)
      setDescription('')
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error')
    }
  }

  const copyLink = async (path: string) => {
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}${path}` : path
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // ignore
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 } }}>
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h4" component="h1" fontWeight={800}>
              Carpetas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tus carpetas de singles. Cada una tiene un link público con su
              slug (ej. /carpetas/full-art).
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setFormError(null)
              setName('')
              setSlug('')
              setSlugTouched(false)
              setDescription('')
              setCreateOpen(true)
            }}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Nueva carpeta
          </Button>
        </Stack>

        {isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">
            {error instanceof Error ? error.message : 'Error al cargar'}
          </Alert>
        ) : !binders?.length ? (
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              textAlign: 'center',
              bgcolor: t => alpha(t.palette.primary.main, 0.04)
            }}
          >
            <Typography color="text.secondary">
              Aún no tienes carpetas. Crea una y elige el slug de tu link
              público.
            </Typography>
          </Paper>
        ) : (
          <Paper variant="outlined">
            <List disablePadding>
              {binders.map((b, i) => (
                <ListItem
                  key={b.id}
                  divider={i < binders.length - 1}
                  secondaryAction={
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {b.publicPath ? (
                        <>
                          <Tooltip title="Copiar link público">
                            <IconButton
                              edge="end"
                              aria-label="Copiar link"
                              onClick={() => void copyLink(b.publicPath)}
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Abrir link público">
                            <IconButton
                              edge="end"
                              component={Link}
                              href={b.publicPath}
                              target="_blank"
                              aria-label="Abrir público"
                            >
                              <OpenInNew fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : null}
                      <IconButton
                        edge="end"
                        aria-label="Eliminar"
                        onClick={() => setDeleteTarget(b)}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Stack>
                  }
                  disablePadding
                >
                  <ListItemButton
                    component={Link}
                    href={`/dashboard/carpetas/${encodeURIComponent(b.id)}`}
                  >
                    <ListItemIcon>
                      <FolderOpenIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={b.name}
                      secondary={
                        b.slug
                          ? `/${`carpetas/${b.slug}`} · ${b.singleCount ?? 0} singles · ${b.publishedCount ?? 0} publicados`
                          : `${b.singleCount ?? 0} singles`
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Stack>

      <Dialog
        open={createOpen}
        onClose={() => !createBinder.isPending && setCreateOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Nueva carpeta</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nombre"
              value={name}
              onChange={e =>
                setName(e.target.value.slice(0, CARD_BINDER_NAME_MAX))
              }
              autoFocus
              fullWidth
              size="small"
            />
            <TextField
              label="Slug del link público"
              value={slugFieldValue}
              onChange={e => {
                setSlugTouched(true)
                // Permitir escribir; normalizar sin comer el cursor de más
                const raw = e.target.value
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, '')
                  .slice(0, CARD_BINDER_SLUG_MAX)
                setSlug(raw)
              }}
              onBlur={() => {
                const next = normalizeCardBinderSlug(slugFieldValue)
                setSlugTouched(true)
                setSlug(next)
              }}
              fullWidth
              size="small"
              required
              placeholder="full-art"
              helperText={
                normalizeCardBinderSlug(slugFieldValue)
                  ? `Se guardará el link: /carpetas/${normalizeCardBinderSlug(slugFieldValue)}`
                  : 'Escribe el slug aquí (ej. full-art). Se genera solo si escribes el nombre.'
              }
              error={
                Boolean(slugFieldValue) &&
                !isValidCardBinderSlug(normalizeCardBinderSlug(slugFieldValue))
              }
            />
            <TextField
              label="Descripción (opcional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={2}
            />
            {formError ? <Alert severity="error">{formError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCreateOpen(false)}
            disabled={createBinder.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleCreate()}
            disabled={createBinder.isPending}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleteBinder.isPending && setDeleteTarget(null)}
      >
        <DialogTitle>Eliminar carpeta</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar «{deleteTarget?.name}» y todos sus singles?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleteBinder.isPending}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteBinder.isPending}
            onClick={async () => {
              if (!deleteTarget) return
              await deleteBinder.mutateAsync(deleteTarget.id)
              setDeleteTarget(null)
            }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
