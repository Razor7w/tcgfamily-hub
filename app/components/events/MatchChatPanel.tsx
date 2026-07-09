'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import SendIcon from '@mui/icons-material/Send'
import { alpha, useTheme } from '@mui/material/styles'
import { useMatchChat } from '@/hooks/useMatchChat'
import OnlineMatchReportBar from '@/components/events/OnlineMatchReportBar'

function formatChatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

export default function MatchChatPanel({
  eventId,
  roundNum,
  tableNumber,
  opponentName,
  enabled,
  readOnly = false,
  showReportBar = true
}: {
  eventId: string
  roundNum: number
  tableNumber: string
  opponentName?: string | null
  enabled: boolean
  /** Staff: solo lectura del chat (sin enviar mensajes). */
  readOnly?: boolean
  /** Mostrar barra de reporte de partida. */
  showReportBar?: boolean
}) {
  const panelKey = `${eventId}:${roundNum}:${tableNumber}`

  return (
    <MatchChatPanelInner
      key={panelKey}
      eventId={eventId}
      roundNum={roundNum}
      tableNumber={tableNumber}
      opponentName={opponentName}
      enabled={enabled}
      readOnly={readOnly}
      showReportBar={showReportBar}
    />
  )
}

function MatchChatPanelInner({
  eventId,
  roundNum,
  tableNumber,
  opponentName,
  enabled,
  readOnly,
  showReportBar
}: {
  eventId: string
  roundNum: number
  tableNumber: string
  opponentName?: string | null
  enabled: boolean
  readOnly: boolean
  showReportBar: boolean
}) {
  const theme = useTheme()
  const listRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')
  const {
    messages,
    transport,
    isLoading,
    loadError,
    sendMessage,
    isSending,
    sendError
  } = useMatchChat({
    eventId,
    roundNum,
    tableNumber,
    enabled
  })

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const t = draft.trim()
    if (!t) return
    sendMessage(t)
    setDraft('')
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        borderColor: alpha(theme.palette.primary.main, 0.2)
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 2,
          py: 1.25,
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Chat de mesa {tableNumber}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ronda {roundNum}
            {opponentName ? ` · vs ${opponentName}` : null}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {transport === 'sse'
            ? 'En vivo'
            : transport === 'poll'
              ? 'Actualizando…'
              : ''}
        </Typography>
      </Stack>

      {showReportBar ? (
        <OnlineMatchReportBar
          eventId={eventId}
          roundNum={roundNum}
          tableNumber={tableNumber}
          enabled={enabled}
        />
      ) : null}

      <Box
        ref={listRef}
        sx={{
          minHeight: 160,
          maxHeight: 280,
          overflowY: 'auto',
          px: 2,
          py: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        {isLoading ? (
          <Stack alignItems="center" py={3}>
            <CircularProgress size={28} />
          </Stack>
        ) : loadError ? (
          <Alert severity="error" variant="outlined">
            {loadError}
          </Alert>
        ) : messages.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Coordiná con tu rival: nick en el simulador, acuerdos de partida,
            etc.
          </Typography>
        ) : (
          messages.map(m => (
            <Box
              key={m.id}
              sx={{
                alignSelf: m.isSelf ? 'flex-end' : 'flex-start',
                maxWidth: '88%'
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: m.isSelf
                    ? alpha(theme.palette.primary.main, 0.12)
                    : m.kind === 'system'
                      ? alpha(theme.palette.warning.main, 0.1)
                      : 'action.hover'
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="baseline"
                  sx={{ mb: 0.25 }}
                >
                  <Typography variant="caption" fontWeight={700}>
                    {m.senderDisplayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatChatTime(m.createdAt)}
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {m.message}
                </Typography>
              </Paper>
            </Box>
          ))
        )}
      </Box>

      {readOnly ? (
        <Box
          sx={{
            px: 2,
            py: 1,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'action.hover'
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Vista staff — solo lectura
          </Typography>
        </Box>
      ) : (
        <Box
          component="form"
          onSubmit={onSubmit}
          sx={{
            px: 1.5,
            py: 1.25,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            gap: 1,
            alignItems: 'flex-end'
          }}
        >
          <TextField
            size="small"
            fullWidth
            multiline
            maxRows={3}
            placeholder="Escribí un mensaje…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            disabled={!enabled || isSending}
            inputProps={{ maxLength: 500 }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSubmit(e as unknown as FormEvent)
              }
            }}
          />
          <IconButton
            type="submit"
            color="primary"
            disabled={!enabled || isSending || !draft.trim()}
            aria-label="Enviar mensaje"
          >
            <SendIcon />
          </IconButton>
        </Box>
      )}

      {sendError ? (
        <Alert severity="error" sx={{ mx: 1.5, mb: 1.5 }} variant="outlined">
          {sendError}
        </Alert>
      ) : null}
    </Paper>
  )
}
