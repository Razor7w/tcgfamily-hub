'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EmojiEvents from '@mui/icons-material/EmojiEvents'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import { alpha } from '@mui/material/styles'
import DashboardModuleRouteGate from '@/components/dashboard/DashboardModuleRouteGate'
import CustomTournamentManualPlacementSection from '@/components/events/CustomTournamentManualPlacementSection'
import DeleteCustomTournamentButton from '@/components/events/DeleteCustomTournamentButton'
import ReportDeckDialog from '@/components/events/ReportDeckDialog'
import TournamentMatchRoundsCard from '@/components/events/TournamentMatchRoundsCard'
import { useDashboardEventDetail } from '@/hooks/useWeeklyEvents'
import {
  getLimitlessPokemonSpriteUrl,
  limitlessSpriteDimensions
} from '@/lib/limitless-pokemon-sprite'
import Link from 'next/link'

const CHIP_DECK_SPRITE_BOX = limitlessSpriteDimensions(24)

export default function TorneoSemanaDetallePage() {
  const params = useParams()
  const router = useRouter()
  const eventId = typeof params.eventId === 'string' ? params.eventId : ''
  const {
    data: ev,
    isPending,
    isError,
    error
  } = useDashboardEventDetail(eventId || null)
  const [deckOpen, setDeckOpen] = useState(false)

  return (
    <DashboardModuleRouteGate moduleId="myTournaments">
      <Box
        sx={t => ({
          minHeight: '100dvh',
          py: { xs: 2, sm: 4 },
          background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`
        })}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Button
            component={Link}
            href="/dashboard/torneos-semana"
            startIcon={<ArrowBackIcon />}
            size="medium"
            sx={t => ({
              mb: { xs: 2, sm: 2.5 },
              ml: { xs: -0.5, sm: 0 },
              color: 'text.secondary',
              fontWeight: 600,
              textTransform: 'none',
              minHeight: 44,
              '&:hover': {
                bgcolor: alpha(t.palette.primary.main, 0.08),
                color: 'primary.main'
              }
            })}
          >
            Volver a tus torneos
          </Button>

          {isPending ? (
            <Stack alignItems="center" py={6}>
              <CircularProgress />
            </Stack>
          ) : isError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error instanceof Error ? error.message : 'No se pudo cargar'}
              <Button
                sx={{ ml: 2 }}
                onClick={() => router.replace('/dashboard/torneos-semana')}
              >
                Ir al listado
              </Button>
            </Alert>
          ) : !ev ? null : (
            <Stack spacing={{ xs: 2.25, sm: 3 }}>
              {!ev.myRegistration && ev.tournamentOrigin !== 'custom' ? (
                <Alert severity="info">
                  No estás preinscrito en este torneo. Preinscríbete desde la
                  vista de eventos para ver el detalle y reportar tu deck.
                </Alert>
              ) : null}

              {ev.myRegistration &&
              ev.kind === 'tournament' &&
              ev.game === 'pokemon' ? (
                <>
                  {ev.tournamentOrigin === 'custom' ? (
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      alignItems={{ xs: 'stretch', sm: 'center' }}
                      justifyContent="space-between"
                    >
                      <Typography variant="body2" color="text.secondary">
                        Torneo <strong>custom</strong>: no está vinculado al
                        calendario de la tienda. Tu récord se calcula con las
                        rondas que reportes.
                      </Typography>
                      {ev.canDeleteCustomTournament ? (
                        <DeleteCustomTournamentButton
                          eventId={eventId}
                          tournamentTitle={ev.title}
                          onDeleted={() =>
                            router.push('/dashboard/torneos-semana')
                          }
                          size="small"
                          variant="outlined"
                        />
                      ) : null}
                    </Stack>
                  ) : null}
                  {ev.tournamentOrigin === 'custom' ? (
                    <CustomTournamentManualPlacementSection
                      eventId={eventId}
                      placement={ev.myTournamentPlacement ?? null}
                    />
                  ) : null}
                  <TournamentMatchRoundsCard
                    eventId={eventId}
                    title={ev.title}
                    startsAtIso={ev.startsAt}
                    location={ev.location}
                    pokemonSubtype={ev.pokemonSubtype}
                    myDeckSlugs={ev.myDeckPokemonSlugs ?? []}
                    rounds={ev.myMatchRounds ?? []}
                    eventState={ev.state}
                    officialMatchRecord={ev.myMatchRecord}
                    tournamentPlacement={ev.myTournamentPlacement ?? null}
                    isCustomTournament={ev.tournamentOrigin === 'custom'}
                    onRequestChoosePokemon={() => setDeckOpen(true)}
                  />

                  <Card
                    elevation={0}
                    sx={t => ({
                      borderRadius: { xs: 2.5, sm: 3 },
                      border: '1px solid',
                      borderColor: alpha(t.palette.text.primary, 0.08),
                      overflow: 'hidden'
                    })}
                  >
                    <Box
                      sx={t => ({
                        px: { xs: 2, sm: 2.5 },
                        py: { xs: 1.5, sm: 1.75 },
                        background: `linear-gradient(90deg, ${alpha(t.palette.primary.main, 0.07)} 0%, ${alpha(t.palette.primary.dark, 0.02)} 100%)`,
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                      })}
                    >
                      <Typography
                        variant="overline"
                        color="text.secondary"
                        sx={{ letterSpacing: '0.08em' }}
                      >
                        Perfil de jugador
                      </Typography>
                    </Box>
                    <CardContent
                      sx={{
                        pt: { xs: 2, sm: 2.5 },
                        pb: { xs: 2.25, sm: 2.5 },
                        px: { xs: 2, sm: 2.5 }
                      }}
                    >
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                        justifyContent="space-between"
                      >
                        <Stack
                          direction="row"
                          spacing={2}
                          alignItems="flex-start"
                        >
                          <Avatar
                            variant="rounded"
                            sx={t => ({
                              width: 48,
                              height: 48,
                              borderRadius: 2,
                              bgcolor: alpha(t.palette.primary.main, 0.12),
                              color: 'primary.main'
                            })}
                          >
                            <EmojiEvents />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>
                              Sprites de tu deck
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ lineHeight: 1.5 }}
                            >
                              Elige dos Pokémon para mostrarlos junto a tu
                              récord en esta vista.
                            </Typography>
                          </Box>
                        </Stack>
                        <Button
                          variant="contained"
                          onClick={() => setDeckOpen(true)}
                          sx={t => ({
                            flexShrink: 0,
                            fontWeight: 700,
                            textTransform: 'none',
                            px: 2.5,
                            boxShadow: 'none',
                            bgcolor: t.palette.grey[900],
                            color: t.palette.common.white,
                            '&:hover': {
                              bgcolor: t.palette.grey[800],
                              boxShadow: 'none'
                            }
                          })}
                        >
                          {ev.myDeckPokemonSlugs?.length
                            ? 'Editar Pokémon'
                            : 'Elegir Pokémon'}
                        </Button>
                      </Stack>
                      {ev.myDeckPokemonSlugs &&
                      ev.myDeckPokemonSlugs.length > 0 ? (
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                          sx={{ mt: 2.5 }}
                        >
                          {ev.myDeckPokemonSlugs.map(slug => (
                            <Chip
                              key={slug}
                              variant="outlined"
                              sx={{
                                borderColor: t =>
                                  alpha(t.palette.primary.main, 0.35)
                              }}
                              label={
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={0.75}
                                >
                                  <Box
                                    sx={{
                                      width: CHIP_DECK_SPRITE_BOX.width,
                                      height: CHIP_DECK_SPRITE_BOX.height,
                                      borderRadius: 0.75,
                                      overflow: 'hidden',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                      bgcolor: 'background.paper'
                                    }}
                                  >
                                    <Box
                                      component="img"
                                      className="pokemon"
                                      src={getLimitlessPokemonSpriteUrl(slug)}
                                      alt=""
                                      sx={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        imageRendering: 'pixelated'
                                      }}
                                    />
                                  </Box>
                                  <Typography
                                    variant="body2"
                                    component="span"
                                    fontWeight={600}
                                  >
                                    {slug}
                                  </Typography>
                                </Stack>
                              }
                            />
                          ))}
                        </Stack>
                      ) : (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 2, fontStyle: 'italic' }}
                        >
                          Aún no elegiste Pokémon: el récord mostrará “Sin
                          Pokémon en perfil” hasta que los configures.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>

                  <ReportDeckDialog
                    open={deckOpen}
                    onClose={() => setDeckOpen(false)}
                    eventId={eventId}
                    eventTitle={ev.title}
                    initialSlugs={ev.myDeckPokemonSlugs ?? []}
                  />
                </>
              ) : ev.myRegistration ? (
                <Alert severity="warning">
                  El reporte de deck y rondas solo aplica a torneos Pokémon TCG.
                  Este evento es de otro tipo o juego.
                </Alert>
              ) : null}
            </Stack>
          )}
        </Container>
      </Box>
    </DashboardModuleRouteGate>
  )
}
