"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EmojiEvents from "@mui/icons-material/EmojiEvents";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import DashboardModuleRouteGate from "@/components/dashboard/DashboardModuleRouteGate";
import ReportDeckDialog from "@/components/events/ReportDeckDialog";
import TournamentMatchRoundsCard from "@/components/events/TournamentMatchRoundsCard";
import { useDashboardEventDetail } from "@/hooks/useWeeklyEvents";
import { getLimitlessPokemonSpriteUrl } from "@/lib/limitless-pokemon-sprite";
import type { WeeklyEventState } from "@/models/WeeklyEvent";
import Link from "next/link";

function stateLabel(s: WeeklyEventState): string {
  if (s === "schedule") return "Programado";
  if (s === "running") return "En curso";
  return "Finalizado";
}

function stateColor(
  s: WeeklyEventState,
): "default" | "primary" | "success" | "warning" {
  if (s === "schedule") return "default";
  if (s === "running") return "warning";
  return "success";
}

export default function TorneoSemanaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const { data: ev, isPending, isError, error } = useDashboardEventDetail(
    eventId || null,
  );
  const [deckOpen, setDeckOpen] = useState(false);

  return (
    <DashboardModuleRouteGate moduleId="weeklyEvents">
      <Box
        sx={{
          minHeight: "100dvh",
          bgcolor: "background.default",
          py: { xs: 2, sm: 4 },
        }}
      >
        <Container maxWidth="md">
          <Button
            component={Link}
            href="/dashboard/torneos-semana"
            startIcon={<ArrowBackIcon />}
            sx={{ mb: 2 }}
          >
            Volver a tus torneos
          </Button>

          {isPending ? (
            <Stack alignItems="center" py={6}>
              <CircularProgress />
            </Stack>
          ) : isError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error instanceof Error ? error.message : "No se pudo cargar"}
              <Button sx={{ ml: 2 }} onClick={() => router.replace("/dashboard/torneos-semana")}>
                Ir al listado
              </Button>
            </Alert>
          ) : !ev ? null : (
            <Stack spacing={3}>
              {!ev.myRegistration ? (
                <Alert severity="info">
                  No estás preinscrito en este torneo. Preinscríbete desde la vista de eventos
                  para ver el detalle y reportar tu deck.
                </Alert>
              ) : null}

              {ev.myRegistration &&
              ev.kind === "tournament" &&
              ev.game === "pokemon" ? (
                <>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip
                      size="small"
                      label={stateLabel(ev.state)}
                      color={stateColor(ev.state)}
                    />
                  </Stack>

                  <TournamentMatchRoundsCard
                    eventId={eventId}
                    title={ev.title}
                    startsAtIso={ev.startsAt}
                    location={ev.location}
                    pokemonSubtype={ev.pokemonSubtype}
                    myDeckSlugs={ev.myDeckPokemonSlugs ?? []}
                    rounds={ev.myMatchRounds ?? []}
                  />

                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        alignItems={{ xs: "stretch", sm: "center" }}
                        justifyContent="space-between"
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <EmojiEvents color="primary" />
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                              Pokémon de tu deck (sprites)
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Edita los dos Pokémon que quieres mostrar junto a tu nombre.
                            </Typography>
                          </Box>
                        </Stack>
                        <Button
                          variant="outlined"
                          onClick={() => setDeckOpen(true)}
                          sx={{ flexShrink: 0 }}
                        >
                          {ev.myDeckPokemonSlugs?.length ? "Editar" : "Elegir Pokémon"}
                        </Button>
                      </Stack>
                      {ev.myDeckPokemonSlugs && ev.myDeckPokemonSlugs.length > 0 ? (
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                          sx={{ mt: 2 }}
                        >
                          {ev.myDeckPokemonSlugs.map((slug) => (
                            <Chip
                              key={slug}
                              variant="outlined"
                              label={
                                <Stack direction="row" alignItems="center" spacing={0.75}>
                                  <Box
                                    component="img"
                                    src={getLimitlessPokemonSpriteUrl(slug)}
                                    alt=""
                                    sx={{
                                      width: 22,
                                      height: 22,
                                      imageRendering: "pixelated",
                                    }}
                                  />
                                  <Typography variant="body2" component="span">
                                    {slug}
                                  </Typography>
                                </Stack>
                              }
                            />
                          ))}
                        </Stack>
                      ) : null}
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
                  El reporte de deck y rondas solo aplica a torneos Pokémon TCG. Este evento es
                  de otro tipo o juego.
                </Alert>
              ) : null}
            </Stack>
          )}
        </Container>
      </Box>
    </DashboardModuleRouteGate>
  );
}
