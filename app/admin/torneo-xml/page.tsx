'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import { ArrowBack, FolderOpen, TableChart } from '@mui/icons-material'
import {
  buildPlayerNameLookup,
  parseTournamentXml,
  type ParsedMatch
} from '@/lib/tournament-xml'

function groupMatchesByRound(matches: ParsedMatch[]): Map<number, ParsedMatch[]> {
  const map = new Map<number, ParsedMatch[]>()
  for (const m of matches) {
    const list = map.get(m.roundNumber) ?? []
    list.push(m)
    map.set(m.roundNumber, list)
  }
  return new Map([...map.entries()].sort((a, b) => a[0] - b[0]))
}

export default function AdminTorneoXmlPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [raw, setRaw] = useState('')
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null)
  const [fileReadError, setFileReadError] = useState<string | null>(null)

  const parsed = useMemo(() => parseTournamentXml(raw), [raw])
  const names = useMemo(
    () => buildPlayerNameLookup(parsed.players),
    [parsed.players]
  )
  const rounds = useMemo(
    () => groupMatchesByRound(parsed.matches),
    [parsed.matches]
  )

  const handlePickFile = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setFileReadError(null)
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      setRaw(text)
      setLoadedFileName(file.name)
      e.target.value = ''
    }
    reader.onerror = () => {
      setFileReadError('No se pudo leer el archivo.')
      setLoadedFileName(null)
      e.target.value = ''
    }
    reader.readAsText(file, 'UTF-8')
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: { xs: 2, sm: 4 }
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={2.5} sx={{ mb: 3 }}>
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
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <TableChart color="primary" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Torneo (XML)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Carga un archivo <strong>.tdf</strong> o pega el XML para ver jugadores (POP userid) y
                emparejamientos por ronda.
              </Typography>
            </Box>
          </Stack>
        </Stack>

        <input
          ref={fileInputRef}
          type="file"
          accept=".tdf,.xml,application/xml,text/xml"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Button
            variant="contained"
            startIcon={<FolderOpen />}
            onClick={handlePickFile}
            sx={{ alignSelf: { sm: 'flex-start' } }}
          >
            Cargar archivo .tdf
          </Button>
          {loadedFileName ? (
            <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
              Archivo: <strong>{loadedFileName}</strong>
            </Typography>
          ) : null}
        </Stack>

        {fileReadError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {fileReadError}
          </Alert>
        ) : null}

        <TextField
          fullWidth
          multiline
          minRows={12}
          maxRows={24}
          label="Contenido (XML / .tdf)"
          placeholder='<?xml version="1.0" ...><tournament ...>'
          value={raw}
          onChange={e => {
            setRaw(e.target.value)
            setLoadedFileName(null)
          }}
          size="small"
          sx={{ mb: 2, '& textarea': { fontFamily: 'monospace', fontSize: 12 } }}
        />

        {raw.trim() && parsed.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {parsed.error}
          </Alert>
        )}

        {parsed.meta && (parsed.meta.name || parsed.meta.startDate) && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Datos del torneo
            </Typography>
            <Stack spacing={0.5}>
              {parsed.meta.name ? (
                <Typography variant="body2">
                  <strong>Nombre:</strong> {parsed.meta.name}
                </Typography>
              ) : null}
              {parsed.meta.startDate ? (
                <Typography variant="body2">
                  <strong>Fecha inicio:</strong> {parsed.meta.startDate}
                </Typography>
              ) : null}
              {(parsed.meta.city || parsed.meta.country) ? (
                <Typography variant="body2">
                  <strong>Lugar:</strong>{' '}
                  {[parsed.meta.city, parsed.meta.state, parsed.meta.country].filter(Boolean).join(', ')}
                </Typography>
              ) : null}
              {(parsed.meta.organizerName || parsed.meta.organizerPopId) ? (
                <Typography variant="body2">
                  <strong>Organizador:</strong> {parsed.meta.organizerName || '—'}{' '}
                  {parsed.meta.organizerPopId ? `(POP ${parsed.meta.organizerPopId})` : ''}
                </Typography>
              ) : null}
              <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ pt: 0.5 }}>
                {parsed.meta.gameType ? (
                  <Chip size="small" label={parsed.meta.gameType} variant="outlined" />
                ) : null}
                {parsed.meta.mode ? (
                  <Chip size="small" label={parsed.meta.mode} variant="outlined" />
                ) : null}
                {parsed.meta.version ? (
                  <Chip size="small" label={`v${parsed.meta.version}`} variant="outlined" />
                ) : null}
              </Stack>
            </Stack>
          </Paper>
        )}

        {parsed.players.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Jugadores ({parsed.players.length})
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User ID</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Nacimiento</TableCell>
                    <TableCell align="center">Starter</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsed.players.map(p => (
                    <TableRow key={p.userId}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{p.userId}</TableCell>
                      <TableCell>
                        {[p.firstName, p.lastName].filter(Boolean).join(' ') || '—'}
                      </TableCell>
                      <TableCell>{p.birthdate || '—'}</TableCell>
                      <TableCell align="center">{p.starter ? 'Sí' : 'No'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {parsed.matches.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Emparejamientos ({parsed.matches.length} partidas)
            </Typography>
            <Stack spacing={2}>
              {[...rounds.entries()].map(([roundNum, list]) => (
                <Paper key={roundNum} variant="outlined" sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Ronda {roundNum}
                      {list[0]?.roundType ? ` · tipo ${list[0].roundType}` : ''}
                    </Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width={72}>Mesa</TableCell>
                          <TableCell>Jugador 1</TableCell>
                          <TableCell>Jugador 2</TableCell>
                          <TableCell>Hora</TableCell>
                          <TableCell>Outcome</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {list.map((m, idx) => (
                          <TableRow key={`${roundNum}-${idx}-${m.tableNumber}`}>
                            <TableCell>{m.tableNumber || '—'}</TableCell>
                            <TableCell>
                              <Typography variant="body2" component="span">
                                {names.get(m.player1UserId) ?? m.player1UserId}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: 'monospace' }}>
                                {m.player1UserId}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" component="span">
                                {names.get(m.player2UserId) ?? m.player2UserId}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: 'monospace' }}>
                                {m.player2UserId}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{m.timestamp || '—'}</TableCell>
                            <TableCell>{m.outcome}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              ))}
            </Stack>
          </>
        )}

        {raw.trim() && !parsed.error && parsed.players.length === 0 && parsed.matches.length === 0 && (
          <Alert severity="info">
            No se encontraron jugadores ni partidas en el XML. Revisa que incluya{' '}
            <code>&lt;players&gt;</code> y <code>&lt;rounds&gt;</code>.
          </Alert>
        )}
      </Container>
    </Box>
  )
}
