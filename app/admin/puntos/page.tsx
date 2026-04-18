'use client'

import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Stack,
  Typography
} from '@mui/material'
import { ArrowBack, CloudUpload } from '@mui/icons-material'

type ImportResult = {
  ok: boolean
  updated: number
  modified: number
  skipped: number
  noIdentifierInCsv: number
  noUserMatch: number
  errors: string[]
}

export default function AdminPuntosPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [severity, setSeverity] = useState<'success' | 'error' | 'info'>('info')
  const [result, setResult] = useState<ImportResult | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setSeverity('error')
      setMessage('Selecciona un archivo .csv')
      return
    }
    setLoading(true)
    setMessage(null)
    setResult(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/admin/import-store-points', {
        method: 'POST',
        body
      })
      const data = (await res.json()) as ImportResult & { error?: string }
      if (!res.ok) {
        setSeverity('error')
        setMessage(data.error || 'Error al importar')
        return
      }
      setResult(data)
      setSeverity('success')
      setMessage(
        `Listo: ${data.updated} usuarios actualizados (${data.modified} con cambios en BD). Sin correo ni RUT en CSV: ${data.noIdentifierInCsv}. Sin coincidencia en la app: ${data.noUserMatch}. Otras omitidas: ${data.skipped}.`
      )
    } catch {
      setSeverity('error')
      setMessage('No se pudo subir el archivo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Button
            component={Link}
            href="/admin/users"
            variant="outlined"
            size="small"
            startIcon={<ArrowBack />}
            sx={{ alignSelf: 'flex-start' }}
          >
            Volver
          </Button>
          <Typography variant="h4" component="h1">
            Importar puntos (CSV)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sube el reporte (CSV con punto y coma, mismo formato que el de
            ejemplo).             Se busca al usuario por RUT (todas las formas guardadas) o por
            correo (minúsculas). Si vienen ambos, primero se intenta por RUT
            (incluye filas solo con RUT) y, si no hay coincidencia, por correo.
            Se sincronizan
            saldo, próximos puntos a vencer y fecha de vencimiento. No se crean
            usuarios nuevos.
          </Typography>
          <Box
            component="form"
            onSubmit={onSubmit}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1
            }}
          >
            <Button component="label" variant="outlined" startIcon={<CloudUpload />}>
              Elegir archivo .csv
              <input
                type="file"
                name="file"
                accept=".csv,text/csv"
                hidden
                onChange={ev => {
                  const f = ev.target.files?.[0]
                  setFile(f ?? null)
                }}
              />
            </Button>
            {file && (
              <Typography variant="body2" color="text.secondary">
                {file.name}
              </Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !file}
            >
              {loading ? 'Procesando…' : 'Importar'}
            </Button>
          </Box>
          {message && (
            <Alert severity={severity} onClose={() => setMessage(null)}>
              {message}
            </Alert>
          )}
          {result && result.errors.length > 0 && (
            <Alert severity="warning">
              <Typography variant="subtitle2" gutterBottom>
                Avisos / errores parciales
              </Typography>
              <Box
                component="ul"
                sx={{ m: 0, pl: 2, maxHeight: 240, overflow: 'auto' }}
              >
                {result.errors.map((err, i) => (
                  <li key={i}>
                    <Typography variant="caption" component="span">
                      {err}
                    </Typography>
                  </li>
                ))}
              </Box>
            </Alert>
          )}
        </Stack>
      </Container>
    </Box>
  )
}
