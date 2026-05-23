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
  Typography
} from '@mui/material'
import {
  CloudUpload,
  Download,
  ExpandLess,
  ExpandMore
} from '@mui/icons-material'
import { TOURNAMENT_POINTS_CSV_TEMPLATE } from '@/lib/tournament-points-csv'
import { useImportTournamentPointsCsv } from '@/hooks/useTournamentPoints'

export default function TournamentPointsCsvImport() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [applyBalance, setApplyBalance] = useState(false)
  const importMutation = useImportTournamentPointsCsv()

  const downloadTemplate = () => {
    const blob = new Blob([TOURNAMENT_POINTS_CSV_TEMPLATE], {
      type: 'text/csv;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-puntos-torneo.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    const body = new FormData()
    body.append('file', file)
    body.append('applyBalance', applyBalance ? '1' : '0')
    await importMutation.mutateAsync(body)
    setFile(null)
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
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Importar asignaciones existentes (CSV)
        </Typography>
      </Button>

      <Collapse in={open}>
        <Stack spacing={2} sx={{ px: 2, pb: 2, pt: 0 }}>
          <Typography variant="body2" color="text.secondary">
            Carga puntos históricos o de torneos ya cerrados. Separador{' '}
            <strong>punto y coma</strong>. Formato recomendado (sin ID de
            evento): <code>torneo;fecha;pop;nombre;puesto;puntos</code> — la{' '}
            <strong>fecha</strong> es opcional (dd/mm/aaaa). Si el torneo existe
            en la app, puedes usar{' '}
            <code>evento_id;pop;nombre;puesto;puntos</code>. También vale solo{' '}
            <code>pop;nombre;puesto;puntos</code> (un bloque «Importación
            histórica»). Si el mismo POP aparece varias veces en un torneo, los
            puntos se <strong>suman</strong>.
          </Typography>

          <Button
            size="small"
            variant="outlined"
            startIcon={<Download />}
            onClick={downloadTemplate}
            sx={{ alignSelf: 'flex-start' }}
          >
            Descargar plantilla
          </Button>

          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={1.5}>
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={<CloudUpload />}
                disabled={importMutation.isPending}
              >
                Elegir archivo .csv
                <input
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={ev => setFile(ev.target.files?.[0] ?? null)}
                />
              </Button>
              {file ? (
                <Typography variant="caption" color="text.secondary">
                  {file.name}
                </Typography>
              ) : null}

              <FormControlLabel
                control={
                  <Checkbox
                    checked={applyBalance}
                    onChange={e => setApplyBalance(e.target.checked)}
                    disabled={importMutation.isPending}
                  />
                }
                label={
                  <Typography variant="body2">
                    Sumar puntos al saldo de cada jugador (desmarcar si el saldo
                    ya fue cargado con otro CSV)
                  </Typography>
                }
              />

              <Button
                type="submit"
                variant="contained"
                disabled={!file || importMutation.isPending}
                sx={{ alignSelf: 'flex-start' }}
              >
                {importMutation.isPending ? 'Importando…' : 'Importar CSV'}
              </Button>
            </Stack>
          </Box>

          {importMutation.isError ? (
            <Alert severity="error">
              {importMutation.error instanceof Error
                ? importMutation.error.message
                : 'Error al importar'}
            </Alert>
          ) : null}

          {importMutation.isSuccess && importMutation.data ? (
            <Alert severity="success" onClose={() => importMutation.reset()}>
              {importMutation.data.eventsCreated} asignación(es) importada(s),{' '}
              {importMutation.data.rowsImported} fila(s).
              {importMutation.data.eventsSkipped > 0
                ? ` Omitidos: ${importMutation.data.eventsSkipped}.`
                : ''}
              {importMutation.data.applyBalance
                ? ` Saldo actualizado en ${importMutation.data.credited} jugador(es).`
                : ' Sin cambios de saldo.'}
            </Alert>
          ) : null}

          {importMutation.data && importMutation.data.errors.length > 0 ? (
            <Alert severity="warning">
              <Typography variant="subtitle2" gutterBottom>
                Avisos
              </Typography>
              <Box
                component="ul"
                sx={{ m: 0, pl: 2, maxHeight: 200, overflow: 'auto' }}
              >
                {importMutation.data.errors.map((err, i) => (
                  <li key={i}>
                    <Typography variant="caption" component="span">
                      {err}
                    </Typography>
                  </li>
                ))}
              </Box>
            </Alert>
          ) : null}
        </Stack>
      </Collapse>
    </Box>
  )
}
