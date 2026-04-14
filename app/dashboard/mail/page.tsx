'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useMyMails } from '@/hooks/useMails'
import { Stack } from '@mui/material'
import ButtonBarCode from '@/components/molecule/ButtonBarCode'

function getElapsedDays(createdAt: string): number {
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  return Math.floor((now - created) / (24 * 60 * 60 * 1000))
}

function formatElapsed(days: number): string {
  return days === 1 ? '1 día' : `${days} días`
}

function getElapsedBadge(days: number): {
  label: string
  color: 'success' | 'warning' | 'error'
} {
  const label = formatElapsed(days)
  if (days <= 7) return { label, color: 'success' }
  if (days <= 14) return { label, color: 'warning' }
  return { label, color: 'error' }
}

function mailUserId(ref: { _id: string } | string): string {
  return typeof ref === 'object' ? ref._id : String(ref)
}

type FilterUser = { id: string; name: string; rut: string }

function filterUserLabel(u: FilterUser) {
  return `${u.name || 'Sin nombre'} (${u.rut || '-'})`
}

export default function DashboardMailPage() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ''

  const [searchId, setSearchId] = useState('')
  const [filterRecived, setFilterRecived] = useState<
    'all' | 'recived' | 'notRecived'
  >('all')
  const [filterFromUser, setFilterFromUser] = useState<FilterUser | null>(null)
  const [filterToUser, setFilterToUser] = useState<FilterUser | null>(null)

  const { data: mailsRes, isLoading, error } = useMyMails()
  const allMails = useMemo(() => mailsRes?.mails ?? [], [mailsRes?.mails])

  const usersFromMails = useMemo(() => {
    const map = new Map<string, FilterUser>()
    for (const m of allMails) {
      const from = m.fromUserId
      const to = m.toUserId
      const fId = mailUserId(from)
      const tId = mailUserId(to)
      if (!map.has(fId))
        map.set(fId, {
          id: fId,
          name:
            (typeof from === 'object' ? from.name : undefined) ?? 'Sin nombre',
          rut: (typeof from === 'object' ? from.rut : undefined) ?? ''
        })
      if (!map.has(tId))
        map.set(tId, {
          id: tId,
          name: (typeof to === 'object' ? to.name : undefined) ?? 'Sin nombre',
          rut: (typeof to === 'object' ? to.rut : undefined) ?? ''
        })
    }
    return Array.from(map.values())
  }, [allMails])

  const mails = useMemo(() => {
    let list = allMails
    const q = searchId.trim().toLowerCase()
    if (q) list = list.filter(m => m._id.toLowerCase().includes(q))
    if (filterRecived === 'recived') list = list.filter(m => m.isRecived)
    else if (filterRecived === 'notRecived')
      list = list.filter(m => !m.isRecived)
    if (filterFromUser)
      list = list.filter(m => mailUserId(m.fromUserId) === filterFromUser.id)
    if (filterToUser)
      list = list.filter(m => mailUserId(m.toUserId) === filterToUser.id)
    return list
  }, [allMails, searchId, filterRecived, filterFromUser, filterToUser])

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh'
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Error al cargar correos: {error.message}</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
          mb: 3,
          direction: 'column'
        }}
      >
        <Button
          component={Link}
          href="/dashboard"
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
        >
          Volver
        </Button>
        <Typography variant="h4" component="h1">
          Mis correos
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          mb: 2
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center'
          }}
        >
          <TextField
            size="small"
            label="Buscar por ID"
            placeholder="ID del mail..."
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <Autocomplete<FilterUser>
            size="small"
            options={usersFromMails}
            value={filterFromUser}
            onChange={(_, v) => setFilterFromUser(v)}
            getOptionLabel={filterUserLabel}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            sx={{ minWidth: 260 }}
            renderInput={params => (
              <TextField
                {...params}
                label="Filtrar por remitente (De)"
                placeholder="Buscar..."
              />
            )}
            filterOptions={(opts, { inputValue }) => {
              const v = inputValue.trim().toLowerCase()
              if (!v) return opts
              return opts.filter(
                u =>
                  u.name?.toLowerCase().includes(v) ||
                  (u.rut &&
                    u.rut
                      .toLowerCase()
                      .replace(/\D/g, '')
                      .includes(v.replace(/\D/g, '')))
              )
            }}
          />
          <Autocomplete<FilterUser>
            size="small"
            options={usersFromMails}
            value={filterToUser}
            onChange={(_, v) => setFilterToUser(v)}
            getOptionLabel={filterUserLabel}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            sx={{ minWidth: 260 }}
            renderInput={params => (
              <TextField
                {...params}
                label="Filtrar por destinatario (Para)"
                placeholder="Buscar..."
              />
            )}
            filterOptions={(opts, { inputValue }) => {
              const v = inputValue.trim().toLowerCase()
              if (!v) return opts
              return opts.filter(
                u =>
                  u.name?.toLowerCase().includes(v) ||
                  (u.rut &&
                    u.rut
                      .toLowerCase()
                      .replace(/\D/g, '')
                      .includes(v.replace(/\D/g, '')))
              )
            }}
          />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button
              size="small"
              variant={filterRecived === 'all' ? 'contained' : 'outlined'}
              onClick={() => setFilterRecived('all')}
            >
              Todos
            </Button>
            <Button
              size="small"
              variant={filterRecived === 'recived' ? 'contained' : 'outlined'}
              color="success"
              onClick={() => setFilterRecived('recived')}
            >
              Recibidos
            </Button>
            <Button
              size="small"
              variant={
                filterRecived === 'notRecived' ? 'contained' : 'outlined'
              }
              color="warning"
              onClick={() => setFilterRecived('notRecived')}
            >
              No recibidos
            </Button>
          </Box>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ width: 64 }}>
                Nº
              </TableCell>
              <TableCell sx={{ width: 110 }}>Tipo</TableCell>
              <TableCell>De</TableCell>
              <TableCell>Para</TableCell>
              <TableCell>Recibido</TableCell>
              <TableCell>Tiempo transcurrido</TableCell>
              <TableCell align="center">Código</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay correos
                </TableCell>
              </TableRow>
            ) : (
              mails.map((mail, index) => {
                const from =
                  typeof mail.fromUserId === 'object' ? mail.fromUserId : null
                const to =
                  typeof mail.toUserId === 'object' ? mail.toUserId : null
                const isEmisor =
                  currentUserId && mailUserId(mail.fromUserId) === currentUserId
                return (
                  <TableRow key={mail._id}>
                    <TableCell align="center" sx={{ fontWeight: 500 }}>
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isEmisor ? 'Emisor' : 'Receptor'}
                        size="small"
                        color={isEmisor ? 'primary' : 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell>
                      {from ? `${from.name ?? '-'} (${from.rut ?? '-'})` : '-'}
                    </TableCell>
                    <TableCell>
                      {to ? `${to.name ?? '-'} (${to.rut ?? '-'})` : '-'}
                    </TableCell>
                    <TableCell>{mail.isRecived ? 'Sí' : 'No'}</TableCell>
                    <TableCell>
                      {(() => {
                        const days = getElapsedDays(mail.createdAt)
                        const { label, color } = getElapsedBadge(days)
                        return (
                          <Chip
                            label={label}
                            color={color}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        )
                      })()}
                    </TableCell>
                    <TableCell align="center">
                      <ButtonBarCode id={mail._id} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  )
}
