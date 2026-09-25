'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Alert,
  alpha,
  Box,
  Button,
  Container,
  Link,
  Stack,
  Tab,
  Tabs,
  Typography
} from '@mui/material'
import { ArrowBack, CloudUpload } from '@mui/icons-material'
import { AdminStorePageHeading } from '@/components/admin/AdminStorePageHeading'
import TournamentPointsAwardPanel from '@/components/admin/TournamentPointsAwardPanel'
import TournamentPointsCouponsPanel from '@/components/admin/TournamentPointsCouponsPanel'
import TournamentPointsManagePanel from '@/components/admin/TournamentPointsManagePanel'
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

type PuntosTab = 'canjes' | 'asignaciones' | 'configuraciones'

export default function AdminPuntosPage() {
  const { data: session } = useSession()
  const isOwner = session?.user?.storeRole === 'owner'
  const { storeCredit } = useDashboardModulesFromLayout()
  const csvEnabled = storeCredit.csvEnabled
  const tournamentEnabled = storeCredit.tournamentPointsEnabled
  const [sectionTitle, setSectionTitle] = useState(
    storeCredit.tournamentPointsLabel
  )
  const [tab, setTab] = useState<PuntosTab>('canjes')

  useEffect(() => {
    setSectionTitle(storeCredit.tournamentPointsLabel)
  }, [storeCredit.tournamentPointsLabel])

  const availableTabs = useMemo(() => {
    const tabs: { value: PuntosTab; label: string }[] = []
    if (tournamentEnabled) {
      tabs.push({ value: 'canjes', label: 'Canjes' })
      tabs.push({ value: 'asignaciones', label: 'Asignaciones' })
      tabs.push({ value: 'configuraciones', label: 'Configuraciones' })
    } else if (csvEnabled) {
      tabs.push({ value: 'configuraciones', label: 'Configuraciones' })
    }
    return tabs
  }, [tournamentEnabled, csvEnabled])

  useEffect(() => {
    if (availableTabs.length === 0) return
    if (!availableTabs.some(t => t.value === tab)) {
      setTab(availableTabs[0].value)
    }
  }, [availableTabs, tab])

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

  const subtitle = tournamentEnabled
    ? `Reparto, canjes y gestión de ${sectionTitle.toLowerCase()}.`
    : csvEnabled
      ? 'Importación CSV del reporte de saldo.'
      : ''

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
              {subtitle ? (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
          </AdminStorePageHeading>

          {availableTabs.length > 0 ? (
            <Tabs
              value={tab}
              onChange={(_e, v: PuntosTab) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {availableTabs.map(t => (
                <Tab key={t.value} value={t.value} label={t.label} />
              ))}
            </Tabs>
          ) : null}

          {tournamentEnabled && tab === 'canjes' ? (
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper'
              }}
            >
              <TournamentPointsCouponsPanel />
            </Box>
          ) : null}

          {tournamentEnabled && tab === 'asignaciones' ? (
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper'
              }}
            >
              <Stack spacing={3}>
                <TournamentPointsAwardPanel />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Gestión y auditoría
                </Typography>
                <TournamentPointsManagePanel />
              </Stack>
            </Box>
          ) : null}

          {tab === 'configuraciones' && (tournamentEnabled || csvEnabled) ? (
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper'
              }}
            >
              <Stack spacing={3}>
                {tournamentEnabled ? (
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      {sectionTitle}
                    </Typography>
                    <TournamentPointsDisplayNameEditor
                      initialCustomName={storeCredit.tournamentPointsCustomName}
                      onLabelChange={setSectionTitle}
                    />
                  </Box>
                ) : null}

                {csvEnabled ? (
                  <Stack spacing={2}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Importar saldo (CSV tienda)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sube el reporte (CSV con punto y coma). Se busca al
                      usuario por RUT o correo y se sincroniza saldo y
                      vencimientos.
                    </Typography>
                    <Box
                      component="form"
                      onSubmit={onSubmit}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
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
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        {loading ? 'Procesando…' : 'Importar'}
                      </Button>
                    </Box>
                    {message ? (
                      <Alert
                        severity={severity}
                        onClose={() => setMessage(null)}
                      >
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
                  </Stack>
                ) : null}

                {tournamentEnabled && isOwner ? (
                  <Typography variant="body2" color="text.secondary">
                    La importación CSV de asignaciones de {sectionTitle} está en
                    la pestaña Asignaciones.
                  </Typography>
                ) : null}
              </Stack>
            </Box>
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
