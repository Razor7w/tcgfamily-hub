'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Alert,
  alpha,
  Box,
  Button,
  Container,
  Divider,
  Link,
  Stack,
  Typography
} from '@mui/material'
import { ArrowBack, CloudUpload } from '@mui/icons-material'
import { AdminStorePageHeading } from '@/components/admin/AdminStorePageHeading'
import TournamentPointsAwardPanel from '@/components/admin/TournamentPointsAwardPanel'
import TournamentPointsManagePanel from '@/components/admin/TournamentPointsManagePanel'
import TournamentPointsCsvImport from '@/components/admin/TournamentPointsCsvImport'
import TournamentPointsDisplayNameEditor from '@/components/admin/TournamentPointsDisplayNameEditor'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'

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
  const { data: session } = useSession()
  const isOwner = session?.user?.storeRole === 'owner'
  const { storeCredit } = useDashboardModulesFromLayout()
  const csvEnabled = storeCredit.csvEnabled
  const tournamentEnabled = storeCredit.tournamentPointsEnabled
  const [sectionTitle, setSectionTitle] = useState(
    storeCredit.tournamentPointsLabel
  )

  useEffect(() => {
    setSectionTitle(storeCredit.tournamentPointsLabel)
  }, [storeCredit.tournamentPointsLabel])

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
      sx={t => ({
        minHeight: '100vh',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: 4
      })}
    >
      <Container maxWidth="md">
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
          <AdminStorePageHeading>
            <Stack spacing={1}>
              <Typography variant="h4" component="h1">
                Puntos de tienda
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {csvEnabled && tournamentEnabled
                  ? 'Importación CSV de saldo y reparto por torneo.'
                  : csvEnabled
                    ? 'Importación CSV del reporte de saldo.'
                    : `Reparto y gestión de ${sectionTitle.toLowerCase()}.`}
              </Typography>
            </Stack>
          </AdminStorePageHeading>

          {tournamentEnabled ? (
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper'
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {sectionTitle}
              </Typography>
              <TournamentPointsDisplayNameEditor
                initialCustomName={storeCredit.tournamentPointsCustomName}
                onLabelChange={setSectionTitle}
              />
              {isOwner ? <TournamentPointsCsvImport /> : null}
              <Divider sx={{ my: 3 }} />
              <TournamentPointsAwardPanel />
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Gestión y auditoría
              </Typography>
              <TournamentPointsManagePanel />
            </Box>
          ) : null}

          {csvEnabled ? (
            <>
              {tournamentEnabled ? <Divider /> : null}
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Importar saldo (CSV tienda)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sube el reporte (CSV con punto y coma). Se busca al usuario por
                RUT o correo y se sincroniza saldo y vencimientos.
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
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUpload />}
                >
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
                {file ? (
                  <Typography variant="body2" color="text.secondary">
                    {file.name}
                  </Typography>
                ) : null}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !file}
                >
                  {loading ? 'Procesando…' : 'Importar'}
                </Button>
              </Box>
              {message ? (
                <Alert severity={severity} onClose={() => setMessage(null)}>
                  {message}
                </Alert>
              ) : null}
              {result && result.errors.length > 0 ? (
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
              ) : null}
            </>
          ) : null}

          {!csvEnabled && !tournamentEnabled ? (
            <Alert severity="info">
              Ninguna función de puntos está habilitada. Actívala en{' '}
              <Link href="/admin/configuracion">Configuración</Link> bajo
              «Crédito de tienda».
            </Alert>
          ) : null}
        </Stack>
      </Container>
    </Box>
  )
}
