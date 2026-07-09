'use client'

import { useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import TeamPostCard from '@/components/teams/TeamPostCard'
import TeamPostComposerDrawer from '@/components/teams/TeamPostComposerDrawer'
import { useTeamPosts } from '@/hooks/useTeamPosts'
import { useLazyInView } from '@/hooks/useLazyInView'
import type { TeamPostsScope } from '@/lib/teams/post-payload'

type Props = {
  teamSlug: string
  teamId?: string
  showComposer?: boolean
  title?: string
  scope?: TeamPostsScope
  lazyLoad?: boolean
}

export default function TeamPostsSection({
  teamSlug,
  teamId,
  showComposer = false,
  title = 'Publicaciones',
  scope = 'public',
  lazyLoad = false
}: Props) {
  const [composerOpen, setComposerOpen] = useState(false)
  const { ref: lazyRef, inView } = useLazyInView('160px')
  const postsEnabled = !lazyLoad || inView
  const { data, isPending, isError, error, refetch } = useTeamPosts(
    teamSlug,
    postsEnabled,
    scope
  )
  const embedded = title === ''

  const feedBody = (
    <>
      {!embedded ? (
        <Typography variant="h6" fontWeight={800} gutterBottom>
          {title}
        </Typography>
      ) : null}

      {isPending ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={180} />
          <Skeleton variant="rounded" height={180} />
        </Stack>
      ) : isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        >
          {error instanceof Error ? error.message : 'Error'}
        </Alert>
      ) : (data?.posts.length ?? 0) === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {scope === 'members'
            ? 'Aún no hay publicaciones en este equipo.'
            : 'Aún no hay publicaciones públicas en este equipo.'}
        </Typography>
      ) : (
        <Stack spacing={2} sx={{ mt: embedded ? 0 : 1 }}>
          {data?.posts.map(post => (
            <TeamPostCard
              key={post.id}
              slug={teamSlug}
              teamId={teamId}
              post={post}
              scope={scope}
            />
          ))}
        </Stack>
      )}
    </>
  )

  return (
    <>
      <Stack spacing={2} ref={lazyLoad ? lazyRef : undefined}>
        {showComposer && teamId ? (
          <Stack direction="row" justifyContent="flex-end">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setComposerOpen(true)}
              sx={{
                boxShadow: t =>
                  `0 8px 24px ${alpha(t.palette.primary.main, 0.2)}`
              }}
            >
              Agregar
            </Button>
          </Stack>
        ) : null}

        {embedded ? (
          feedBody
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: t => alpha(t.palette.text.primary, 0.08)
            }}
          >
            {feedBody}
          </Paper>
        )}
      </Stack>

      {showComposer && teamId ? (
        <TeamPostComposerDrawer
          open={composerOpen}
          teamId={teamId}
          teamSlug={teamSlug}
          onClose={() => setComposerOpen(false)}
        />
      ) : null}
    </>
  )
}
