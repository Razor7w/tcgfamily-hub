'use client'

import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type OnlineMatchReportPlayerDTO = {
  popId: string
  displayName: string
}

export type OnlineMatchReportDTO = {
  status: 'open' | 'verifying' | 'verified' | 'conflict'
  player1: OnlineMatchReportPlayerDTO
  player2: OnlineMatchReportPlayerDTO
  myReportedWinnerPopId: string | null
  opponentReportedWinnerPopId: string | null
  opponentReported: boolean
  winnerPopId: string | null
  winnerIsMe: boolean | null
  verifyDeadline: string | null
  verifiedAt: string | null
  canSubmit: boolean
  canStaffResolve: boolean
  isStaff: boolean
}

const POLL_MS = 3000

function reportQueryKey(roomKey: string) {
  return ['online-table-report', roomKey] as const
}

async function fetchOnlineMatchReport(args: {
  eventId: string
  roundNum: number
  tableNumber: string
}): Promise<OnlineMatchReportDTO> {
  const params = new URLSearchParams({
    roundNum: String(args.roundNum),
    tableNumber: args.tableNumber
  })
  const res = await fetch(
    `/api/events/${args.eventId}/online-table-report?${params}`,
    { cache: 'no-store' }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Error al cargar reporte'
    )
  }
  return data.report as OnlineMatchReportDTO
}

export function useOnlineMatchReport(args: {
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

  const roomKey = `${eventId}:${roundNum}:${tableNumber}`
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const query = useQuery({
    queryKey: reportQueryKey(roomKey),
    queryFn: () =>
      fetchOnlineMatchReport({
        eventId: eventId!,
        roundNum,
        tableNumber
      }),
    enabled: active,
    refetchInterval: query => {
      const status = query.state.data?.status
      if (status === 'verified') return false
      return POLL_MS
    },
    staleTime: 0
  })

  const report = query.data

  useEffect(() => {
    if (!report?.verifyDeadline) return
    const id = window.setInterval(() => setNowMs(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [report?.verifyDeadline])

  const countdownSec = report?.verifyDeadline
    ? (() => {
        const left = Math.max(
          0,
          Math.ceil((new Date(report.verifyDeadline).getTime() - nowMs) / 1000)
        )
        return left > 0 ? left : null
      })()
    : null

  const submitMutation = useMutation({
    mutationFn: async (winnerPopId: string) => {
      const res = await fetch(`/api/events/${eventId}/online-table-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundNum, tableNumber, winnerPopId })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'No se pudo reportar'
        )
      }
      return data.report as OnlineMatchReportDTO
    },
    onMutate: () => setSubmitError(null),
    onSuccess: data => {
      queryClient.setQueryData(reportQueryKey(roomKey), data)
    },
    onError: err => {
      setSubmitError(err instanceof Error ? err.message : 'Error al reportar')
    }
  })

  const resolveMutation = useMutation({
    mutationFn: async (winnerPopId: string) => {
      const res = await fetch(`/api/events/${eventId}/online-table-report`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundNum, tableNumber, winnerPopId })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'No se pudo resolver'
        )
      }
      return data.report as OnlineMatchReportDTO
    },
    onMutate: () => setSubmitError(null),
    onSuccess: data => {
      queryClient.setQueryData(reportQueryKey(roomKey), data)
      queryClient.invalidateQueries({
        queryKey: ['admin-online-table-reports']
      })
    },
    onError: err => {
      setSubmitError(err instanceof Error ? err.message : 'Error al resolver')
    }
  })

  const submitWinner = useCallback(
    (winnerPopId: string) => {
      if (submitMutation.isPending || !report?.canSubmit) return
      submitMutation.mutate(winnerPopId)
    },
    [submitMutation, report?.canSubmit]
  )

  const staffResolve = useCallback(
    (winnerPopId: string) => {
      if (resolveMutation.isPending || !report?.canStaffResolve) return
      resolveMutation.mutate(winnerPopId)
    },
    [resolveMutation, report?.canStaffResolve]
  )

  const isSubmitting = submitMutation.isPending || resolveMutation.isPending

  return {
    report: report ?? null,
    isLoading: query.isPending,
    loadError: query.error instanceof Error ? query.error.message : null,
    submitWinner,
    staffResolve,
    isSubmitting,
    submitError,
    countdownSec,
    refetch: query.refetch
  }
}
