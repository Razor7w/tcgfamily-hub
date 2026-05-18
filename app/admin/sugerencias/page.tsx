'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import { useSession } from 'next-auth/react'
import { AdminStorePageHeading } from '@/components/admin/AdminStorePageHeading'
import { useAdminSuggestions } from '@/hooks/useAdminSuggestions'

function formatWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function userLabel(
  user: {
    name: string
    email: string
    rut: string
    popid: string
  } | null
) {
  if (!user) return 'Usuario eliminado'
  const name = user.name.trim()
  if (name) return name
  if (user.email.trim()) return user.email.trim()
  if (user.rut.trim()) return user.rut.trim()
  return 'Sin nombre'
}

export default function AdminSugerenciasPage() {
  const { data: session, status } = useSession()
  const isOwner = session?.user?.storeRole === 'owner'
  const { data, isPending, isError, error, refetch } = useAdminSuggestions(
    status === 'authenticated' && isOwner
  )
  const rows = data?.suggestions ?? []
  const total = data?.total ?? 0

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        py: 4,
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.05)} 0%, ${t.palette.background.default} 42%)`
      })}
    >
      <Container maxWidth="lg">
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
              <LightbulbOutlinedIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
                Sugerencias de usuarios
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75, maxWidth: 560, lineHeight: 1.6 }}
              >
                Comentarios enviados desde el panel de Inicio (máximo uno por
                cuenta). Solo visible para el owner de la plataforma.
              </Typography>
            </Box>
          </Stack>
        </AdminStorePageHeading>

        <Box sx={{ mt: 3 }}>
          {status === 'authenticated' && !isOwner ? (
            <Alert severity="warning">
              Solo el owner de la plataforma puede ver las sugerencias de los
              usuarios.
            </Alert>
          ) : isPending ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : isError ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => refetch()}>
                  Reintentar
                </Button>
              }
            >
              {error instanceof Error ? error.message : 'Error al cargar'}
            </Alert>
          ) : total === 0 ? (
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ py: 5, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  Aún no hay sugerencias enviadas.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Card
              variant="outlined"
              sx={{ borderRadius: 3, overflow: 'hidden' }}
            >
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: 'wrap'
                }}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  {total} {total === 1 ? 'comentario' : 'comentarios'}
                </Typography>
                <Chip
                  size="small"
                  label="Más recientes primero"
                  variant="outlined"
                />
              </Box>
              <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Usuario</TableCell>
                      <TableCell>RUT / POP ID</TableCell>
                      <TableCell sx={{ minWidth: 280 }}>Sugerencia</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {formatWhen(row.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {userLabel(row.user)}
                          </Typography>
                          {row.user?.email ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {row.user.email}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {row.user?.rut?.trim() || '—'}
                          {row.user?.popid?.trim() ? (
                            <Typography
                              variant="caption"
                              display="block"
                              color="text.secondary"
                            >
                              {row.user.popid}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}
                          >
                            {row.text}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack
                spacing={2}
                sx={{ p: 2, display: { xs: 'flex', md: 'none' } }}
              >
                {rows.map(row => (
                  <Card
                    key={row.id}
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                  >
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        {formatWhen(row.createdAt)}
                      </Typography>
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{ mt: 0.5 }}
                      >
                        {userLabel(row.user)}
                      </Typography>
                      {row.user?.email ? (
                        <Typography variant="body2" color="text.secondary">
                          {row.user.email}
                        </Typography>
                      ) : null}
                      {(row.user?.rut || row.user?.popid) && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {[row.user?.rut, row.user?.popid]
                            .filter(Boolean)
                            .join(' · ')}
                        </Typography>
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 1.5,
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.55
                        }}
                      >
                        {row.text}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Card>
          )}
        </Box>
      </Container>
    </Box>
  )
}
