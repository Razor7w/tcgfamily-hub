'use client'

import PublicIcon from '@mui/icons-material/Public'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import Link from 'next/link'
import { DecklistSpritePair } from '@/components/decklist/DecklistPokemonSlotPickers'
import { useRecentPublicDecklists } from '@/hooks/useSavedDecklists'

const PREVIEW_LIMIT = 3

export default function RecentPublicDecklistsHomeCard() {
  const {
    data: decklists,
    isPending,
    isError,
    error
  } = useRecentPublicDecklists(PREVIEW_LIMIT)

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        borderColor: t => alpha(t.palette.text.primary, 0.1),
        boxShadow: t =>
          t.palette.mode === 'dark'
            ? `0 14px 40px -28px ${alpha('#000', 0.45)}`
            : `0 14px 44px -30px ${alpha(t.palette.primary.dark, 0.12)}`
      }}
    >
      <CardHeader
        avatar={
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: t => alpha(t.palette.primary.main, 0.1),
              color: 'primary.main'
            }}
          >
            <PublicIcon fontSize="small" aria-hidden />
          </Box>
        }
        title="Últimos mazos públicos"
        subheader="Compartidos recientemente por la comunidad"
        slotProps={{
          title: {
            variant: 'h6',
            sx: {
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              textWrap: 'balance'
            }
          },
          subheader: {
            sx: {
              mt: 0.35,
              fontWeight: 500,
              lineHeight: 1.45,
              maxWidth: '52ch',
              textWrap: 'pretty'
            }
          }
        }}
        action={
          <Button
            component={Link}
            href="/dashboard/decklists/publicos"
            size="small"
            variant="text"
            sx={{
              fontWeight: 700,
              flexShrink: 0,
              transition: 'background-color 0.2s, color 0.2s',
              '&:hover': {
                bgcolor: t => alpha(t.palette.primary.main, 0.08)
              }
            }}
          >
            Ver todos
          </Button>
        }
        sx={{
          alignItems: 'flex-start',
          pb: 1,
          '& .MuiCardHeader-action': { alignSelf: 'center', mt: 0 }
        }}
      />
      <CardContent sx={{ pt: 0, pb: 2.5, px: { xs: 2, sm: 2.5 } }}>
        {isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : isError ? (
          <Typography color="text.secondary" variant="body2">
            {error instanceof Error ? error.message : 'No se pudo cargar'}
          </Typography>
        ) : !decklists?.length ? (
          <Typography variant="body2" color="text.secondary">
            Todavía no hay mazos públicos. Podés compartir el tuyo desde{' '}
            <Link href="/dashboard/decklists" style={{ fontWeight: 600 }}>
              Mis decklists
            </Link>
            .
          </Typography>
        ) : (
          <Box
            component="ul"
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))'
              },
              gap: { xs: 1.5, sm: 2 },
              p: 0,
              m: 0,
              listStyle: 'none'
            }}
          >
            {decklists.map(row => {
              const sub = new Date(row.updatedAt).toLocaleString('es-CL', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })
              const ownerInitial =
                row.ownerName.trim().charAt(0).toUpperCase() || '?'
              return (
                <Box
                  component="li"
                  key={row.id}
                  sx={{ minWidth: 0, display: 'flex' }}
                >
                  <ButtonBase
                    component={Link}
                    href={`/dashboard/decklists/publicos/${row.id}`}
                    sx={{
                      width: '100%',
                      borderRadius: 2.5,
                      textAlign: 'left',
                      display: 'block',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: t =>
                        alpha(
                          t.palette.text.primary,
                          t.palette.mode === 'dark' ? 0.04 : 0.02
                        ),
                      transition:
                        'border-color 0.22s ease, box-shadow 0.22s ease, transform 0.18s ease, background-color 0.22s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: t => alpha(t.palette.primary.main, 0.06),
                        boxShadow: t =>
                          `0 10px 28px -16px ${alpha(t.palette.primary.main, 0.35)}`,
                        transform: 'translateY(-2px)'
                      },
                      '&:active': {
                        transform: 'translateY(0)'
                      },
                      '&.Mui-focusVisible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 2
                      }
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{
                        p: { xs: 1.75, sm: 2 },
                        alignItems: 'center',
                        width: '100%',
                        minWidth: 0
                      }}
                    >
                      <Avatar
                        src={row.ownerImage ?? undefined}
                        alt=""
                        sx={{
                          width: 42,
                          height: 42,
                          flexShrink: 0,
                          border: '2px solid',
                          borderColor: 'background.paper',
                          boxShadow: t =>
                            `0 2px 8px ${alpha(t.palette.common.black, 0.12)}`
                        }}
                      >
                        {ownerInitial}
                      </Avatar>
                      <Box sx={{ flexShrink: 0 }}>
                        <DecklistSpritePair
                          slugs={row.pokemonSlugs}
                          size={34}
                        />
                      </Box>
                      <Stack spacing={0.35} sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            lineHeight: 1.25,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}
                        >
                          {row.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {row.ownerName} · {sub}
                        </Typography>
                      </Stack>
                    </Stack>
                  </ButtonBase>
                </Box>
              )
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
