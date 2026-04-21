'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import { alpha, useTheme } from '@mui/material/styles'
import DecklistModule from '@/components/decklist/DecklistModule'
import {
  DECKLIST_VARIANT_LABEL_MAX,
  DECKLIST_VARIANTS_MAX,
  SAVED_DECKLIST_TEXT_MAX
} from '@/lib/decklist-constants'

export type DecklistVariantDTO = {
  id: string
  label: string
  deckText: string
}

type Props = {
  decklistId: string
  /** Texto guardado al crear el mazo (listado base). */
  baseDeckText: string
  /** Si no es null, la pestaña Principal muestra el texto de esa variante. */
  principalVariantId: string | null
  variants: DecklistVariantDTO[]
}

export default function DecklistVariantsPanel({
  decklistId,
  baseDeckText,
  principalVariantId,
  variants
}: Props) {
  const theme = useTheme()
  const router = useRouter()
  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  const [tab, setTab] = useState<string>('principal')
  /** Tras crear variante: cambiar pestaña solo cuando el servidor ya la devuelve en `variants`. */
  const [pendingOpenTabId, setPendingOpenTabId] = useState<string | null>(null)

  const resolvedTab = useMemo(() => {
    if (tab === 'principal') return 'principal'
    if (variants.some(v => v.id === tab)) return tab
    return 'principal'
  }, [tab, variants])

  useEffect(() => {
    if (tab !== resolvedTab) setTab(resolvedTab)
  }, [resolvedTab, tab])

  useEffect(() => {
    if (pendingOpenTabId && variants.some(v => v.id === pendingOpenTabId)) {
      setTab(pendingOpenTabId)
      setPendingOpenTabId(null)
    }
  }, [variants, pendingOpenTabId])

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [patchError, setPatchError] = useState<string | null>(null)

  const [newLabel, setNewLabel] = useState('')
  const [newDeckText, setNewDeckText] = useState('')

  const editing = variants.find(v => v.id === resolvedTab) ?? null

  const principalDisplayText = useMemo(() => {
    if (!principalVariantId) return baseDeckText
    const v = variants.find(x => x.id === principalVariantId)
    return v?.deckText ?? baseDeckText
  }, [baseDeckText, principalVariantId, variants])

  const openAdd = () => {
    setFormError(null)
    setNewLabel('')
    setNewDeckText('')
    setAddOpen(true)
  }

  const openEdit = () => {
    if (!editing) return
    setFormError(null)
    setNewLabel(editing.label)
    setNewDeckText(editing.deckText)
    setEditOpen(true)
  }

  const closeAll = () => {
    setAddOpen(false)
    setEditOpen(false)
    setDeleteOpen(false)
    setFormError(null)
    setPending(false)
  }

  const handleAdd = async () => {
    setPending(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/decklists/${decklistId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabel.trim(),
          deckText: newDeckText.trim()
        })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(
          typeof j.error === 'string' ? j.error : 'No se pudo crear la variante'
        )
        setPending(false)
        return
      }
      const newId = j.variant?.id as string | undefined
      setAddOpen(false)
      setNewLabel('')
      setNewDeckText('')
      if (newId) setPendingOpenTabId(newId)
      refresh()
    } catch {
      setFormError('Error de red. Intenta de nuevo.')
    } finally {
      setPending(false)
    }
  }

  const handleEdit = async () => {
    if (!editing) return
    setPending(true)
    setFormError(null)
    try {
      const res = await fetch(
        `/api/decklists/${decklistId}/variants/${editing.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: newLabel.trim(),
            deckText: newDeckText.trim()
          })
        }
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(
          typeof j.error === 'string' ? j.error : 'No se pudo guardar'
        )
        setPending(false)
        return
      }
      setEditOpen(false)
      refresh()
    } catch {
      setFormError('Error de red. Intenta de nuevo.')
    } finally {
      setPending(false)
    }
  }

  const patchPrincipalVariant = async (
    principalVariantIdNext: string | null
  ) => {
    setPending(true)
    setPatchError(null)
    try {
      const res = await fetch(`/api/decklists/${decklistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ principalVariantId: principalVariantIdNext })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPatchError(
          typeof j.error === 'string' ? j.error : 'No se pudo actualizar'
        )
        return
      }
      refresh()
    } catch {
      setPatchError('Error de red. Intenta de nuevo.')
    } finally {
      setPending(false)
    }
  }

  const handleUseVariantAsPrincipal = async () => {
    if (!editing) return
    await patchPrincipalVariant(editing.id)
    setTab('principal')
  }

  const handleUseBaseDeckAsPrincipal = async () => {
    await patchPrincipalVariant(null)
  }

  const handleDelete = async () => {
    if (!editing) return
    setPending(true)
    setFormError(null)
    try {
      const res = await fetch(
        `/api/decklists/${decklistId}/variants/${editing.id}`,
        { method: 'DELETE' }
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(
          typeof j.error === 'string' ? j.error : 'No se pudo eliminar'
        )
        setPending(false)
        return
      }
      setTab('principal')
      setDeleteOpen(false)
      refresh()
    } catch {
      setFormError('Error de red. Intenta de nuevo.')
    } finally {
      setPending(false)
    }
  }

  const activeDeckText =
    resolvedTab === 'principal'
      ? principalDisplayText
      : (variants.find(v => v.id === resolvedTab)?.deckText ?? '')

  const atVariantLimit = variants.length >= DECKLIST_VARIANTS_MAX

  const principalLabel = principalVariantId
    ? (variants.find(v => v.id === principalVariantId)?.label ?? 'Variante')
    : null

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        boxShadow:
          theme.palette.mode === 'dark'
            ? `0 12px 36px -20px ${alpha('#000', 0.45)}`
            : `0 14px 40px -28px ${alpha(theme.palette.primary.dark, 0.12)}`
      }}
    >
      <Box
        sx={{
          px: { xs: 1, sm: 1.5 },
          pt: { xs: 1, sm: 1.25 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(
            theme.palette.primary.main,
            theme.palette.mode === 'dark' ? 0.06 : 0.03
          )
        }}
      >
        <Stack spacing={1.25}>
          {patchError ? (
            <Alert severity="error" sx={{ mx: { xs: 0.5, sm: 0 } }}>
              {patchError}
            </Alert>
          ) : null}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'text.secondary',
                px: { xs: 0.5, sm: 0 }
              }}
            >
              Listas del mazo
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              disabled={atVariantLimit || pending}
              onClick={openAdd}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                alignSelf: { xs: 'stretch', sm: 'center' },
                transition: 'transform 0.15s ease, box-shadow 0.2s ease',
                '&:active': { transform: 'translateY(1px) scale(0.99)' }
              }}
            >
              Añadir variante
            </Button>
          </Stack>

          <Tabs
            value={resolvedTab}
            onChange={(_e, v) => setTab(v as string)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: 44,
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0'
              },
              '& .MuiTab-root': {
                minHeight: 44,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9375rem',
                letterSpacing: '-0.01em',
                transition: 'color 0.2s ease',
                '&.Mui-selected': { fontWeight: 800 }
              }
            }}
          >
            <Tab
              value="principal"
              label={
                <Stack
                  direction="row"
                  alignItems="center"
                  gap={0.5}
                  component="span"
                >
                  Principal
                  {principalVariantId ? (
                    <StarRoundedIcon
                      sx={{ fontSize: 18, opacity: 0.9 }}
                      color="primary"
                      aria-hidden
                    />
                  ) : null}
                </Stack>
              }
            />
            {variants.map(v => (
              <Tab
                key={v.id}
                value={v.id}
                label={
                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={0.5}
                    component="span"
                  >
                    <span>
                      {v.label.length > 22
                        ? `${v.label.slice(0, 20)}…`
                        : v.label}
                    </span>
                    {principalVariantId === v.id ? (
                      <StarRoundedIcon
                        sx={{ fontSize: 16, opacity: 0.85 }}
                        color="primary"
                        aria-hidden
                      />
                    ) : null}
                  </Stack>
                }
              />
            ))}
          </Tabs>

          {resolvedTab === 'principal' && principalVariantId ? (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              sx={{ pb: 0.5, px: { xs: 0.5, sm: 0 } }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                Listado principal: variante «{principalLabel}»
              </Typography>
              <Button
                size="small"
                variant="text"
                color="inherit"
                onClick={() => void handleUseBaseDeckAsPrincipal()}
                disabled={pending}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                Usar listado base del mazo
              </Button>
            </Stack>
          ) : null}

          {resolvedTab !== 'principal' && editing ? (
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ pb: 1, px: { xs: 0.5, sm: 0 } }}
            >
              <Button
                size="small"
                variant="text"
                color="primary"
                startIcon={<StarRoundedIcon fontSize="small" />}
                onClick={() => void handleUseVariantAsPrincipal()}
                disabled={pending || principalVariantId === editing.id}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                {principalVariantId === editing.id
                  ? 'Ya es el listado principal'
                  : 'Usar como listado principal'}
              </Button>
              <Button
                size="small"
                variant="text"
                color="primary"
                startIcon={<EditOutlinedIcon fontSize="small" />}
                onClick={openEdit}
                disabled={pending}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                Editar
              </Button>
              <Button
                size="small"
                variant="text"
                color="error"
                startIcon={<DeleteOutlineIcon fontSize="small" />}
                onClick={() => {
                  setFormError(null)
                  setDeleteOpen(true)
                }}
                disabled={pending}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                Eliminar
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <DecklistModule key={resolvedTab} value={activeDeckText} />
      </Box>

      <Dialog
        open={addOpen}
        onClose={() => !pending && closeAll()}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Nueva variante
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Misma identidad del mazo (sprites arriba); solo cambia el listado
              (tech distinto, conteos, etc.).
            </Typography>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <TextField
              label="Nombre de la variante"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              fullWidth
              required
              inputProps={{ maxLength: DECKLIST_VARIANT_LABEL_MAX }}
              helperText={`Ej. «+1 fan», «Torneo local». ${newLabel.length}/${DECKLIST_VARIANT_LABEL_MAX}`}
            />
            <TextField
              label="Texto del decklist"
              value={newDeckText}
              onChange={e => setNewDeckText(e.target.value)}
              multiline
              minRows={10}
              maxRows={22}
              fullWidth
              required
              inputProps={{ maxLength: SAVED_DECKLIST_TEXT_MAX }}
              helperText={`${newDeckText.length}/${SAVED_DECKLIST_TEXT_MAX}`}
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '0.8125rem',
                  lineHeight: 1.65,
                  fontVariantNumeric: 'tabular-nums'
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => !pending && closeAll()} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={pending || !newLabel.trim() || !newDeckText.trim()}
            sx={{ fontWeight: 700 }}
          >
            {pending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => !pending && closeAll()}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Editar variante
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <TextField
              label="Nombre de la variante"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              fullWidth
              required
              inputProps={{ maxLength: DECKLIST_VARIANT_LABEL_MAX }}
              helperText={`${newLabel.length}/${DECKLIST_VARIANT_LABEL_MAX}`}
            />
            <TextField
              label="Texto del decklist"
              value={newDeckText}
              onChange={e => setNewDeckText(e.target.value)}
              multiline
              minRows={10}
              maxRows={22}
              fullWidth
              required
              inputProps={{ maxLength: SAVED_DECKLIST_TEXT_MAX }}
              helperText={`${newDeckText.length}/${SAVED_DECKLIST_TEXT_MAX}`}
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '0.8125rem',
                  lineHeight: 1.65,
                  fontVariantNumeric: 'tabular-nums'
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => !pending && closeAll()} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleEdit}
            disabled={pending || !newLabel.trim() || !newDeckText.trim()}
            sx={{ fontWeight: 700 }}
          >
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => !pending && setDeleteOpen(false)}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>¿Eliminar variante?</DialogTitle>
        <DialogContent>
          {formError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          ) : null}
          <Typography variant="body2" color="text.secondary">
            Se borrará «{editing?.label}».
            {principalVariantId === editing?.id
              ? ' Dejarás de usar esta variante como listado principal (se mostrará el listado base).'
              : ' El listado base del mazo no se modifica.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => !pending && setDeleteOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={pending}
            sx={{ fontWeight: 700 }}
          >
            {pending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
