'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type MatchChatMessageDTO = {
  id: string
  senderUserId: string | null
  senderDisplayName: string
  message: string
  kind: 'user' | 'system'
  createdAt: string
  isSelf: boolean
}

export type MatchChatContextDTO = {
  roundNum: number
  tableNumber: string
  opponentName: string | null
  canChat: boolean
  isStaff: boolean
  reason?: string
}

const POLL_MS = 3000

function mergeMessages(
  prev: MatchChatMessageDTO[],
  incoming: MatchChatMessageDTO[]
): MatchChatMessageDTO[] {
  if (incoming.length === 0) return prev
  const byId = new Map(prev.map(m => [m.id, m]))
  for (const m of incoming) byId.set(m.id, m)
  return [...byId.values()].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
      a.id.localeCompare(b.id)
  )
}

function messagesQueryKey(roomKey: string) {
  return ['match-chat-messages', roomKey] as const
}

async function fetchMatchChatMessages(args: {
  eventId: string
  roundNum: number
  tableNumber: string
  sinceId?: string | null
  since?: string | null
}): Promise<MatchChatMessageDTO[]> {
  const params = new URLSearchParams({
    roundNum: String(args.roundNum),
    tableNumber: args.tableNumber
  })
  if (args.sinceId) params.set('sinceId', args.sinceId)
  else if (args.since) params.set('since', args.since)

  const res = await fetch(`/api/events/${args.eventId}/match-chat?${params}`, {
    cache: 'no-store'
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Error al cargar mensajes'
    )
  }
  return (data.messages ?? []) as MatchChatMessageDTO[]
}

export function useMatchChatContext(eventId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['match-chat-context', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/match-chat?context=1`, {
        cache: 'no-store'
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al cargar chat'
        )
      }
      return data.context as MatchChatContextDTO
    },
    enabled: Boolean(eventId && enabled),
    staleTime: 0,
    refetchInterval: enabled ? 15_000 : false
  })
}

export function useMatchChat(args: {
  eventId: string | null
  roundNum: number
  tableNumber: string
  enabled: boolean
}) {
  const { eventId, roundNum, tableNumber, enabled } = args
  const active =
    enabled &&
    Boolean(eventId) &&
    roundNum >= 1 &&
    tableNumber.trim().length > 0

  const queryClient = useQueryClient()
  const [sendError, setSendError] = useState<string | null>(null)
  const [sseFailed, setSseFailed] = useState(false)
  const cursorRef = useRef<{ sinceId: string | null; since: string | null }>({
    sinceId: null,
    since: null
  })
  const esRef = useRef<EventSource | null>(null)

  const roomKey = `${eventId}:${roundNum}:${tableNumber}`
  const canUseSse = active && typeof EventSource !== 'undefined' && !sseFailed
  const transport: 'sse' | 'poll' | 'idle' = !active
    ? 'idle'
    : canUseSse
      ? 'sse'
      : 'poll'

  const messagesQuery = useQuery({
    queryKey: messagesQueryKey(roomKey),
    queryFn: () =>
      fetchMatchChatMessages({
        eventId: eventId!,
        roundNum,
        tableNumber
      }),
    enabled: active,
    staleTime: 0
  })

  const appendMessages = useCallback(
    (incoming: MatchChatMessageDTO[]) => {
      if (incoming.length === 0) return
      queryClient.setQueryData<MatchChatMessageDTO[]>(
        messagesQueryKey(roomKey),
        old => mergeMessages(old ?? [], incoming)
      )
      const last = incoming[incoming.length - 1]
      if (last) cursorRef.current = { sinceId: last.id, since: null }
    },
    [queryClient, roomKey]
  )

  useEffect(() => {
    if (!messagesQuery.data?.length) return
    const last = messagesQuery.data[messagesQuery.data.length - 1]
    if (last) cursorRef.current = { sinceId: last.id, since: null }
  }, [messagesQuery.data])

  useEffect(() => {
    if (!canUseSse || !eventId) return

    const params = new URLSearchParams({
      roundNum: String(roundNum),
      tableNumber
    })
    const cur = cursorRef.current
    if (cur.sinceId) params.set('sinceId', cur.sinceId)
    else if (cur.since) params.set('since', cur.since)

    const es = new EventSource(
      `/api/events/${eventId}/match-chat/stream?${params}`
    )
    esRef.current = es

    es.onmessage = ev => {
      try {
        const payload = JSON.parse(ev.data) as {
          type?: string
          messages?: MatchChatMessageDTO[]
        }
        if (payload.type === 'messages' && Array.isArray(payload.messages)) {
          appendMessages(payload.messages)
        }
        if (payload.type === 'reconnect') {
          es.close()
          esRef.current = null
          setSseFailed(true)
        }
      } catch {
        /* ignore malformed */
      }
    }

    es.onerror = () => {
      es.close()
      esRef.current = null
      setSseFailed(true)
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [canUseSse, eventId, roundNum, tableNumber, roomKey, appendMessages])

  useQuery({
    queryKey: ['match-chat-poll', roomKey],
    queryFn: async () => {
      const cur = cursorRef.current
      const incoming = await fetchMatchChatMessages({
        eventId: eventId!,
        roundNum,
        tableNumber,
        sinceId: cur.sinceId,
        since: cur.since
      })
      appendMessages(incoming)
      return incoming
    },
    enabled: active && transport === 'poll',
    refetchInterval: POLL_MS,
    staleTime: 0
  })

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/events/${eventId}/match-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundNum, tableNumber, message: text })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'No se pudo enviar'
        )
      }
      return data.message as MatchChatMessageDTO
    },
    onMutate: () => setSendError(null),
    onSuccess: msg => {
      appendMessages([msg])
    },
    onError: err => {
      setSendError(err instanceof Error ? err.message : 'Error al enviar')
    }
  })

  const sendMessage = useCallback(
    (text: string) => {
      const t = text.trim()
      if (!t || sendMutation.isPending) return
      sendMutation.mutate(t)
    },
    [sendMutation]
  )

  return {
    messages: messagesQuery.data ?? [],
    transport,
    isLoading: messagesQuery.isPending,
    loadError:
      messagesQuery.error instanceof Error ? messagesQuery.error.message : null,
    sendMessage,
    isSending: sendMutation.isPending,
    sendError
  }
}
