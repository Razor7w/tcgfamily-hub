'use client'

import { useEffect, useMemo, useState } from 'react'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import { alpha } from '@mui/material/styles'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import DashboardHomeContent from '@/components/dashboard/DashboardHomeContent'
import StoreHubRightRail from '@/components/dashboard/StoreHubRightRail'
import DashboardPageWithRightRail from '@/components/layouts/DashboardPageWithRightRail'
import { consumeHubActiveStoreHeaderSync } from '@/lib/active-store-hub-sync-flag'
import {
  fetchMeStores,
  meStoresQueryKey,
  useMeStores
} from '@/hooks/useMeStores'

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
  const { data: meStores } = useMeStores()

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

        if (cancelled) return

        if (hid !== activeId) {
          if (consumeHubActiveStoreHeaderSync(hid)) {
            await update({ activeStoreId: hid })
            if (!cancelled) setHubReady(true)
            return
          }

          if (activeId) {
            if (consumeHubActiveStoreHeaderSync(activeId)) {
              const activeRow = rows.find(r => String(r.id) === activeId)
              if (activeRow?.slug?.trim()) {
                router.replace(`/${encodeURIComponent(activeRow.slug.trim())}`)
              }
              return
            }

            const activeRow = rows.find(r => String(r.id) === activeId)
            if (
              activeRow?.slug?.trim() &&
              normSlug(activeRow.slug) !== normalizedParam
            ) {
              router.replace(`/${encodeURIComponent(activeRow.slug.trim())}`)
              return
            }
          }

          if (!activeId) {
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
                typeof body.activeStoreId === 'string'
                  ? body.activeStoreId
                  : hid
            })
            router.refresh()
            return
          }
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

  const storeRows = Array.isArray(meStores?.stores) ? meStores.stores : []
  const activeStoreFromList = activeId
    ? storeRows.find(r => String(r.id) === activeId)
    : undefined
  const activeStoreName =
    activeStoreFromList?.name?.trim() ||
    (resolvedStoreName?.storeId === activeId
      ? resolvedStoreName.name.trim()
      : '') ||
    ''
  const activeStoreHeading = activeStoreName
    ? {
        name: activeStoreName,
        logoUrl:
          typeof activeStoreFromList?.logoUrl === 'string'
            ? activeStoreFromList.logoUrl.trim()
            : ''
      }
    : null

  const hubContentReady =
    status !== 'loading' &&
    (hubReady || (Boolean(activeId) && Boolean(activeStoreHeading?.name)))

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: 4
      })}
    >
      <DashboardPageWithRightRail
        rail={
          <StoreHubRightRail
            storeSlug={normalizedParam}
            hubReady={hubContentReady}
          />
        }
      >
        <Container
          maxWidth={false}
          sx={{
            px: { xs: 2, sm: 3 },
            width: '100%',
            maxWidth: { lg: 920 }
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            {activeStoreHeading ? (
              <Avatar
                variant="rounded"
                src={activeStoreHeading.logoUrl || undefined}
                alt=""
                sx={{
                  width: { xs: 44, sm: 52 },
                  height: { xs: 44, sm: 52 },
                  flexShrink: 0,
                  bgcolor: 'action.hover',
                  border: 1,
                  borderColor: 'divider',
                  '& .MuiAvatar-img': {
                    objectFit: 'contain',
                    p: 0.5
                  }
                }}
              >
                <StorefrontOutlinedIcon sx={{ fontSize: 28 }} />
              </Avatar>
            ) : null}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4" component="h1" gutterBottom={false}>
                {activeStoreHeading?.name ?? ''}
              </Typography>
              <Typography
                variant="subtitle1"
                color="text.secondary"
                sx={{ mt: 0.5, mb: 0.5 }}
              >
                Hola {session?.user?.name ?? ''}
              </Typography>
            </Box>
          </Stack>

          <DashboardHomeContent variant="tiendas" hubReady={hubContentReady} />
        </Container>
      </DashboardPageWithRightRail>
    </Box>
  )
}
