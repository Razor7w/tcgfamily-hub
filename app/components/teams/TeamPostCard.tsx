'use client'

import { useState } from 'react'
import Link from 'next/link'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ThumbDownAltOutlinedIcon from '@mui/icons-material/ThumbDownAltOutlined'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useSession } from 'next-auth/react'
import { DecklistSpritePair } from '@/components/decklist/DecklistPokemonSlotPickers'
import {
  useCreateTeamPostComment,
  useDeleteTeamPost,
  useTeamPostComments,
  useTeamPostReaction
} from '@/hooks/useTeamPosts'
import TeamPostComposerDrawer from '@/components/teams/TeamPostComposerDrawer'
import type { TeamPostsScope } from '@/lib/teams/post-payload'
import type { TeamPostDTO } from '@/lib/teams/post-payload'
import { TEAM_POST_VISIBILITY_LABELS } from '@/lib/teams/post-constants'

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

type Props = {
  slug: string
  post: TeamPostDTO
  teamId?: string
  scope?: TeamPostsScope
}

export default function TeamPostCard({
  slug,
  post,
  teamId,
  scope = 'public'
}: Props) {
  const { status } = useSession()
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentErr, setCommentErr] = useState<string | null>(null)

  const react = useTeamPostReaction(slug)
  const remove = useDeleteTeamPost(slug, scope)
  const addComment = useCreateTeamPostComment(slug, post.id)
  const { data: commentsData, isPending: commentsPending } =
    useTeamPostComments(slug, post.id, commentsOpen)

  const loggedIn = status === 'authenticated'

  async function handleReaction(value: 1 | -1) {
    if (!loggedIn) return
    const next = post.viewerReaction === value ? null : value
    await react.mutateAsync({ postId: post.id, value: next })
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    setCommentErr(null)
    const text = commentText.trim()
    if (!text) return
    try {
      await addComment.mutateAsync(text)
      setCommentText('')
    } catch (err) {
      setCommentErr(err instanceof Error ? err.message : 'Error al comentar')
    }
  }

  const likeActive = post.viewerReaction === 1
  const dislikeActive = post.viewerReaction === -1

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          borderColor: t => alpha(t.palette.text.primary, 0.1)
        }}
      >
        {post.coverUrl ? (
          <Box
            component="img"
            src={post.coverUrl}
            alt=""
            sx={{
              width: '100%',
              maxHeight: 320,
              objectFit: 'cover',
              display: 'block'
            }}
          />
        ) : null}

        <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              src={post.author.imageUrl || undefined}
              sx={{ width: 40, height: 40 }}
            >
              {post.author.displayName.slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
              >
                <Typography fontWeight={700} noWrap>
                  {post.author.displayName}
                </Typography>
                {post.visibility === 'members_only' ? (
                  <Chip
                    size="small"
                    icon={
                      <LockOutlinedIcon sx={{ fontSize: '14px !important' }} />
                    }
                    label={TEAM_POST_VISIBILITY_LABELS.members_only}
                    variant="outlined"
                    sx={{ height: 24 }}
                  />
                ) : null}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {formatWhen(post.createdAt)}
              </Typography>
            </Box>
            {post.canEdit && teamId ? (
              <IconButton
                size="small"
                aria-label="Editar publicación"
                onClick={() => setEditOpen(true)}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            ) : null}
            {post.canDelete ? (
              <IconButton
                size="small"
                aria-label="Eliminar publicación"
                disabled={remove.isPending}
                onClick={() => void remove.mutateAsync(post.id)}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            ) : null}
          </Stack>

          {post.title ? (
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{ mt: 1.5, letterSpacing: '-0.02em' }}
            >
              {post.title}
            </Typography>
          ) : null}

          <Box
            className="team-post-body"
            sx={{
              mt: 1.25,
              color: 'text.primary',
              lineHeight: 1.7,
              '& p': { mb: 1 },
              '& p:last-child': { mb: 0 },
              '& a': { color: 'primary.main' }
            }}
            dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
          />

          {post.decklist ? (
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: t => alpha(t.palette.primary.main, 0.18),
                bgcolor: t => alpha(t.palette.primary.main, 0.04)
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Mazo vinculado · {post.decklist.ownerName}
              </Typography>
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ mt: 0.75 }}
              >
                <DecklistSpritePair
                  slugs={post.decklist.pokemonSlugs}
                  size={36}
                />
                <Button
                  component={Link}
                  href={`/dashboard/decklists/publicos/${post.decklist.id}`}
                  size="small"
                  sx={{ fontWeight: 700, textTransform: 'none' }}
                >
                  {post.decklist.name}
                </Button>
              </Stack>
            </Box>
          ) : null}

          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{ mt: 2 }}
          >
            <Button
              size="small"
              startIcon={
                likeActive ? <ThumbUpIcon /> : <ThumbUpAltOutlinedIcon />
              }
              color={likeActive ? 'primary' : 'inherit'}
              disabled={!loggedIn || react.isPending}
              onClick={() => void handleReaction(1)}
              sx={{ fontWeight: 600 }}
            >
              {post.likeCount}
            </Button>
            <Button
              size="small"
              startIcon={
                dislikeActive ? <ThumbDownIcon /> : <ThumbDownAltOutlinedIcon />
              }
              color={dislikeActive ? 'secondary' : 'inherit'}
              disabled={!loggedIn || react.isPending}
              onClick={() => void handleReaction(-1)}
              sx={{ fontWeight: 600 }}
            >
              {post.dislikeCount}
            </Button>
            <Button
              size="small"
              startIcon={<ChatBubbleOutlineIcon />}
              onClick={() => setCommentsOpen(v => !v)}
              sx={{ fontWeight: 600 }}
            >
              {post.commentCount}
            </Button>
          </Stack>

          {!loggedIn ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              Inicia sesión para reaccionar o comentar.
            </Typography>
          ) : null}

          <Collapse in={commentsOpen}>
            <Stack
              spacing={1.5}
              sx={{
                mt: 2,
                pt: 2,
                borderTop: '1px solid',
                borderColor: 'divider'
              }}
            >
              {commentsPending ? (
                <Typography variant="body2" color="text.secondary">
                  Cargando comentarios…
                </Typography>
              ) : (commentsData?.comments.length ?? 0) === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Sé el primero en comentar.
                </Typography>
              ) : (
                commentsData?.comments.map(c => (
                  <Stack key={c.id} direction="row" spacing={1.25}>
                    <Avatar
                      src={c.author.imageUrl || undefined}
                      sx={{ width: 28, height: 28 }}
                    >
                      {c.author.displayName.slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700}>
                        {c.author.displayName}
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 1, fontWeight: 400 }}
                        >
                          {formatWhen(c.createdAt)}
                        </Typography>
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ whiteSpace: 'pre-wrap' }}
                      >
                        {c.body}
                      </Typography>
                    </Box>
                  </Stack>
                ))
              )}

              {loggedIn ? (
                <Box component="form" onSubmit={handleComment}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Escribe un comentario…"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      disabled={addComment.isPending}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={addComment.isPending || !commentText.trim()}
                    >
                      Comentar
                    </Button>
                  </Stack>
                  {commentErr ? (
                    <Alert severity="error" sx={{ mt: 1, borderRadius: 2 }}>
                      {commentErr}
                    </Alert>
                  ) : null}
                </Box>
              ) : null}
            </Stack>
          </Collapse>
        </Box>
      </Paper>

      {teamId && editOpen ? (
        <TeamPostComposerDrawer
          open={editOpen}
          teamId={teamId}
          teamSlug={slug}
          editPost={post}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </>
  )
}
