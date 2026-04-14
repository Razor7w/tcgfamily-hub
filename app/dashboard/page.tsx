'use client'
import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  CircularProgress,
  Grid
} from '@mui/material'
import { useSession } from 'next-auth/react'
import { ExpandMore, MarkunreadMailbox } from '@mui/icons-material'
import CardMail from '@/components/dashboard/CardMails'

type StoreCredit = {
  storePoints: number
  storePointsExpiringNext: number
  storePointsExpiryDate: string | null
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [credit, setCredit] = useState<StoreCredit | null>(null)
  const [creditLoading, setCreditLoading] = useState(true)
  const [creditError, setCreditError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/me/store-credit')
        if (!res.ok) {
          if (!cancelled) {
            setCreditError('No se pudieron cargar los puntos')
            setCredit(null)
          }
          return
        }
        const data = (await res.json()) as StoreCredit
        if (!cancelled) {
          setCredit(data)
          setCreditError(null)
        }
      } catch {
        if (!cancelled) setCreditError('No se pudieron cargar los puntos')
      } finally {
        if (!cancelled) setCreditLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const expiryLabel =
    credit?.storePointsExpiryDate &&
    new Date(credit.storePointsExpiryDate).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
          Hola {session && session.user.name}
        </Typography>
        <Grid container>
          <Accordion defaultExpanded sx={{ width: '100%' }}>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel1-content"
              id="panel1-header"
            >
              <MarkunreadMailbox sx={{ mr: 2 }} />
              <Typography component="span">Últimos Correos</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <CardMail />
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel2-content"
              id="panel2-header"
            >
              <Typography component="span">Crédito de tienda</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {creditLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : creditError ? (
                <Typography color="text.secondary">{creditError}</Typography>
              ) : credit ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="h5" component="p">
                    {credit.storePoints.toLocaleString('es-CL')} puntos
                  </Typography>
                  {credit.storePointsExpiringNext > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Próximos a vencer:{' '}
                      {credit.storePointsExpiringNext.toLocaleString('es-CL')}{' '}
                      puntos
                      {expiryLabel ? ` · vencimiento: ${expiryLabel}` : ''}
                    </Typography>
                  )}
                  {credit.storePointsExpiringNext === 0 &&
                    credit.storePoints > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No hay puntos próximos a vencer con fecha informada.
                      </Typography>
                    )}
                  {credit.storePoints === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Tu saldo de puntos es 0. Los puntos se actualizan cuando el
                      administrador importa el reporte.
                    </Typography>
                  )}
                </Box>
              ) : null}
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Container>
    </Box>
  )
}
