'use client'

import Link from 'next/link'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import ChevronRight from '@mui/icons-material/ChevronRight'
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined'
import GroupsOutlined from '@mui/icons-material/GroupsOutlined'
import {
  PLAY_POKEMON_CHILE_LEADERBOARD_PATH,
  PLAY_POKEMON_COMMUNITY_RANKING_PATH
} from '@/lib/play-pokemon-leaderboard/constants'
import { useMyChampionshipPoints } from '@/hooks/useMyChampionshipPoints'
import { useTeamsMe } from '@/hooks/useTeams'

type DiscoverTileProps = {
  href: string
  icon: React.ReactNode
  eyebrow: string
  title: string
  body: string
  statusLabel: string
  statusTone: 'default' | 'success' | 'warning'
  secondaryAction?: {
    href: string
    label: string
  }
}

function DiscoverTile({
  href,
  icon,
  eyebrow,
  title,
  body,
  statusLabel,
  statusTone,
  secondaryAction
}: DiscoverTileProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 1.5,
        p: { xs: 2, sm: 2.25 },
        minHeight: { xs: 0, sm: 168 },
        color: 'inherit',
        position: 'relative',
        transition: 'background-color 0.22s ease'
      }}
    >
      <Box
        component={Link}
        href={href}
        aria-label={`${title}. ${body}`}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          flex: 1,
          color: 'inherit',
          textDecoration: 'none',
          borderRadius: 1.5,
          transition:
            'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.22s ease',
          '&:hover': {
            bgcolor: theme => alpha(theme.palette.primary.main, 0.04),
            transform: 'translateY(-1px)',
            '& [data-discover-chevron]': {
              transform: 'translateX(3px)',
              color: 'primary.main'
            },
            '& [data-discover-icon]': {
              borderColor: theme => alpha(theme.palette.primary.main, 0.38),
              bgcolor: theme => alpha(theme.palette.primary.main, 0.14)
            }
          },
          '&:active': {
            transform: 'translateY(0) scale(0.995)',
            transitionDuration: '0.1s'
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2
          }
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            data-discover-icon
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              border: '1px solid',
              borderColor: theme => alpha(theme.palette.primary.main, 0.18),
              bgcolor: theme => alpha(theme.palette.primary.main, 0.08),
              color: 'primary.main',
              transition: 'border-color 0.22s ease, background-color 0.22s ease'
            }}
          >
            {icon}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
              sx={{ mb: 0.5 }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, letterSpacing: '0.02em' }}
              >
                {eyebrow}
              </Typography>
              <Chip
                label={statusLabel}
                size="small"
                color={
                  statusTone === 'success'
                    ? 'success'
                    : statusTone === 'warning'
                      ? 'warning'
                      : 'default'
                }
                variant="outlined"
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  '& .MuiChip-label': { px: 0.85 }
                }}
              />
            </Stack>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                textWrap: 'balance',
                mb: 0.5
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.5, maxWidth: '36ch', textWrap: 'pretty' }}
            >
              {body}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        flexWrap="wrap"
        sx={{ mt: 'auto' }}
      >
        <Box
          component={Link}
          href={href}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'text.secondary',
            fontWeight: 700,
            fontSize: '0.8125rem',
            textDecoration: 'none',
            '&:hover': { color: 'primary.main' },
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2,
              borderRadius: 1
            }
          }}
        >
          <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
            Ver más
          </Typography>
          <ChevronRight sx={{ fontSize: 18 }} />
        </Box>
        {secondaryAction ? (
          <Box
            component={Link}
            href={secondaryAction.href}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'primary.main',
              fontWeight: 700,
              fontSize: '0.8125rem',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
                borderRadius: 1
              }
            }}
          >
            <Typography
              component="span"
              variant="body2"
              sx={{ fontWeight: 700 }}
            >
              {secondaryAction.label}
            </Typography>
            <ChevronRight sx={{ fontSize: 18 }} />
          </Box>
        ) : null}
      </Stack>
    </Box>
  )
}

function DiscoverSkeleton() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: 0
      }}
    >
      <Skeleton variant="rounded" height={168} sx={{ m: 1, borderRadius: 2 }} />
      <Skeleton variant="rounded" height={168} sx={{ m: 1, borderRadius: 2 }} />
    </Box>
  )
}

export default function DashboardHomeDiscoverCard() {
  const { data: cp, isPending: cpPending } = useMyChampionshipPoints()
  const { data: teamsMe, isPending: teamsPending } = useTeamsMe()

  const loading = cpPending || teamsPending
  const cpLinked = cp?.found === true && cp?.source === 'linked'
  const cpRankPublic = cp?.rankPublic === true
  const membership = teamsMe?.membership ?? null
  const pendingApplication = teamsMe?.application ?? null
  const cpEnabled = cp?.enabled !== false

  const teamTile: DiscoverTileProps = membership
    ? {
        href: `/equipos/${membership.teamSlug}`,
        icon: <GroupsOutlined fontSize="small" aria-hidden />,
        eyebrow: 'Equipos',
        title: membership.teamName,
        body: 'Invita amigos, comparte la página pública y publica con tu grupo.',
        statusLabel: 'Activo',
        statusTone: 'success'
      }
    : pendingApplication
      ? {
          href: '/dashboard/equipo',
          icon: <GroupsOutlined fontSize="small" aria-hidden />,
          eyebrow: 'Equipos',
          title: pendingApplication.name,
          body: 'Tu solicitud está en revisión. Cuando se apruebe podrás invitar jugadores.',
          statusLabel: 'En revisión',
          statusTone: 'warning'
        }
      : {
          href: '/dashboard/equipo',
          icon: <GroupsOutlined fontSize="small" aria-hidden />,
          eyebrow: 'Equipos',
          title: 'Crea tu equipo',
          body: 'Forma un grupo con amigos, publica novedades y comparte vuestra página.',
          statusLabel: 'Nuevo',
          statusTone: 'default'
        }

  const cpTile: DiscoverTileProps | null = cpEnabled
    ? cpLinked
      ? {
          href: '/dashboard/perfil',
          icon: <EmojiEventsOutlined fontSize="small" aria-hidden />,
          eyebrow: 'Play! Pokémon',
          title: 'Championship Points',
          body: 'Tus CP quedan en el perfil aunque el leaderboard oficial se reinicie.',
          statusLabel: 'Vinculado',
          statusTone: 'success',
          ...(cpRankPublic
            ? {
                secondaryAction: {
                  href: PLAY_POKEMON_COMMUNITY_RANKING_PATH,
                  label: 'Ranking de jugadores'
                }
              }
            : {})
        }
      : {
          href: PLAY_POKEMON_CHILE_LEADERBOARD_PATH,
          icon: <EmojiEventsOutlined fontSize="small" aria-hidden />,
          eyebrow: 'Play! Pokémon',
          title: 'Vincula tus CP',
          body: 'Búscate en Ranking Chile y guarda clasificación y Play! Points.',
          statusLabel: 'Por vincular',
          statusTone: 'default'
        }
    : null

  return (
    <Box
      component="section"
      aria-label="Novedades del panel"
      data-tour="dashboard-discover-card"
      sx={theme => ({
        width: '100%',
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: alpha(theme.palette.primary.main, 0.14),
        boxShadow: `0 18px 44px -28px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.55 : 0.28)}`,
        backgroundImage: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 52%)`
      })}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 2.25 },
          pt: { xs: 1.75, sm: 2 },
          pb: 0.5
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: '0.01em' }}
        >
          Novedades en tu perfil
        </Typography>
      </Box>

      {loading ? (
        <DiscoverSkeleton />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: cpTile ? '1fr 1fr' : '1fr'
            },
            '& > * + *': {
              borderTop: { xs: '1px solid', sm: 'none' },
              borderLeft: { xs: 'none', sm: '1px solid' },
              borderColor: theme => alpha(theme.palette.divider, 0.9)
            }
          }}
        >
          <DiscoverTile {...teamTile} />
          {cpTile ? <DiscoverTile {...cpTile} /> : null}
        </Box>
      )}
    </Box>
  )
}
