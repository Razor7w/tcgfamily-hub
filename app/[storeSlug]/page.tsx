'use client'

import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import DashboardHomeContent from '@/components/dashboard/DashboardHomeContent'
import { invalidateStoreScopedDashboardQueries } from '@/lib/invalidate-store-scoped-queries'
import { fetchMeStores, meStoresQueryKey } from '@/hooks/useMeStores'

function normSlug(s: string) {
  return s.trim().toLowerCase()
}

export default function StoreHubPage() {
  const params = useParams()
  const paramSlugFromRoute = useMemo(() => {
    const raw = params?.storeSlug
    return typeof raw === 'string' ? raw : ''
  }, [params?.storeSlug])
  const normalizedParam = normSlug(paramSlugFromRoute)

  return (
    <StoreHubBody
      key={normalizedParam || 'no-slug'}
      paramSlug={paramSlugFromRoute}
      normalizedParam={normalizedParam}
    />
  )
}

function StoreHubBody({
  paramSlug,
  normalizedParam
}: {
  paramSlug: string
  normalizedParam: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session, status, update } = useSession()

  const activeId = session?.user?.activeStoreId?.trim() ?? ''

  const [resolvedStoreName, setResolvedStoreName] = useState<{
    storeId: string
    name: string
  } | null>(null)

  const [hubReady, setHubReady] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id) {
      router.replace('/')
      return
    }
    if (!normalizedParam) {
      router.replace('/dashboard')
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const uid = String(session.user.id)
        const data = await queryClient.ensureQueryData({
          queryKey: meStoresQueryKey(uid),
          queryFn: fetchMeStores
        })
        const rows = Array.isArray(data.stores) ? data.stores : []

        const hit = rows.find(
          r =>
            typeof r.slug === 'string' && normSlug(r.slug) === normalizedParam
        )

        if (cancelled) return

        if (!hit?.id || typeof hit.slug !== 'string') {
          router.replace('/dashboard')
          return
        }

        const canonSlug = hit.slug.trim()
        if (paramSlug !== canonSlug) {
          router.replace(`/${encodeURIComponent(canonSlug)}`)
          return
        }

        const hid = String(hit.id)
        setResolvedStoreName({
          storeId: hid,
          name: typeof hit.name === 'string' ? hit.name : ''
        })

        if (hid !== activeId) {
          const sr = await fetch('/api/me/active-store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storeId: hid })
          })
          if (!sr.ok || cancelled) {
            router.replace('/dashboard')
            return
          }
          const body = (await sr.json()) as { activeStoreId?: string }
          await update({
            activeStoreId:
              typeof body.activeStoreId === 'string' ? body.activeStoreId : hid
          })
          await invalidateStoreScopedDashboardQueries(queryClient)
          router.refresh()
          return
        }

        if (!cancelled) setHubReady(true)
      } catch {
        if (!cancelled) router.replace('/dashboard')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    activeId,
    normalizedParam,
    paramSlug,
    queryClient,
    router,
    session?.user?.id,
    status,
    update
  ])

  const activeStoreLine =
    activeId &&
    resolvedStoreName?.storeId === activeId &&
    resolvedStoreName.name
      ? resolvedStoreName.name
      : ''

  const hubContentReady = status !== 'loading' && hubReady

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: 4
      })}
    >
      <Container maxWidth="lg">
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {activeStoreLine ? `${activeStoreLine}` : ''}
          </Typography>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            sx={{ mb: 0.5 }}
          >
            Hola {session?.user?.name ?? ''}
          </Typography>
        </Box>

        <DashboardHomeContent variant="tiendas" hubReady={hubContentReady} />
      </Container>
    </Box>
  )
}
