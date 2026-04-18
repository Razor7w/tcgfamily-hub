"use client";

import EmojiEvents from "@mui/icons-material/EmojiEvents";
import ChevronRight from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { useMyRecentTournaments } from "@/hooks/useWeeklyEvents";
import type { MyTournamentWeekItem } from "@/lib/my-tournament-week-types";
import { getLimitlessPokemonSpriteUrl } from "@/lib/limitless-pokemon-sprite";

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function wltSummary(
  r: { wins: number; losses: number; ties: number } | null,
): string | null {
  if (!r) return null;
  const sum = r.wins + r.losses + r.ties;
  if (sum === 0) return null;
  return `${r.wins}-${r.losses}-${r.ties}`;
}

function placementSummary(t: MyTournamentWeekItem): string | null {
  if (!t.placement) return null;
  if (t.placement.isDnf) return `${t.placement.categoryLabel} · DNF`;
  if (t.placement.place != null && t.placement.place > 0) {
    return `${t.placement.categoryLabel} · ${t.placement.place}º lugar`;
  }
  return t.placement.categoryLabel;
}

function hasReportedDetails(t: MyTournamentWeekItem): boolean {
  const wlt = wltSummary(t.myMatchRecord);
  const place = placementSummary(t);
  const deck = t.deckPokemonSlugs && t.deckPokemonSlugs.length > 0;
  return Boolean(wlt || place || deck);
}

type MyTournamentsDashboardSummaryProps = {
  onCreateCustom?: () => void;
};

export default function MyTournamentsDashboardSummary({
  onCreateCustom,
}: MyTournamentsDashboardSummaryProps) {
  const { data, isPending, isError, error, refetch } = useMyRecentTournaments(2);
  const list = data?.tournaments ?? [];

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <CardHeader
        avatar={
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
              color: "primary.main",
            }}
          >
            <EmojiEvents sx={{ fontSize: 22 }} />
          </Box>
        }
        title={
          <Typography variant="h6" component="h2" fontWeight={800}>
            Mis torneos
          </Typography>
        }
        subheader="Tus dos últimas participaciones"
        action={
          <Button
            component={Link}
            href="/dashboard/torneos-semana"
            size="small"
            endIcon={<ChevronRight sx={{ fontSize: 18 }} />}
            sx={{ textTransform: "none", fontWeight: 700, mr: -0.5 }}
          >
            Ver todo
          </Button>
        }
        slotProps={{
          subheader: { variant: "body2", color: "text.secondary", sx: { mt: 0.25 } },
        }}
        sx={{ pb: 1, "& .MuiCardHeader-action": { alignSelf: "center" } }}
      />
      <CardContent sx={{ pt: 0 }}>
        {isPending ? (
          <Stack spacing={1.5}>
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
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
            {error instanceof Error ? error.message : "No se pudo cargar"}
          </Alert>
        ) : list.length === 0 ? (
          <Stack spacing={2} alignItems="flex-start">
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Aún no tienes torneos en tu historial. Preinscríbete en eventos de la semana o
              registra un torneo custom.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap>
              <Button
                component={Link}
                href="/dashboard/eventos"
                variant="outlined"
                size="small"
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Ver eventos
              </Button>
              {onCreateCustom ? (
                <Button
                  variant="contained"
                  size="small"
                  onClick={onCreateCustom}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Registrar torneo custom
                </Button>
              ) : null}
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {list.map((t) => {
              const origin = t.tournamentOrigin ?? "official";
              const wlt = wltSummary(t.myMatchRecord);
              const place = placementSummary(t);
              const deckSlugs = t.deckPokemonSlugs ?? [];
              const reported = hasReportedDetails(t);

              return (
                <Paper
                  key={t.eventId}
                  component={Link}
                  href={`/dashboard/torneos-semana/${t.eventId}`}
                  variant="outlined"
                  sx={(theme) => ({
                    display: "block",
                    p: 2,
                    borderRadius: 2,
                    textDecoration: "none",
                    color: "inherit",
                    borderColor: alpha(theme.palette.text.primary, 0.1),
                    bgcolor: alpha(theme.palette.text.primary, 0.02),
                    transition: "background-color 0.15s ease, border-color 0.15s ease",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      borderColor: alpha(theme.palette.primary.main, 0.25),
                    },
                  })}
                >
                  <Stack spacing={1.25}>
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      justifyContent="space-between"
                      gap={1}
                    >
                      <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.3 }}>
                        {t.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={origin === "custom" ? "Custom" : "Oficial"}
                        color={origin === "custom" ? "secondary" : "default"}
                        variant="outlined"
                        sx={{ flexShrink: 0, height: 24, fontSize: "0.7rem" }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {formatWhen(t.startsAt)}
                    </Typography>

                    {reported ? (
                      <>
                        <Divider sx={{ borderStyle: "dashed" }} />
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={2}
                          alignItems={{ xs: "stretch", sm: "flex-start" }}
                        >
                          {wlt ? (
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="overline"
                                color="text.secondary"
                                sx={{ fontSize: "0.65rem", letterSpacing: "0.08em" }}
                              >
                                Récord
                              </Typography>
                              <Typography
                                variant="h5"
                                component="p"
                                sx={{
                                  fontWeight: 800,
                                  fontVariantNumeric: "tabular-nums",
                                  lineHeight: 1.2,
                                  mt: 0.25,
                                }}
                              >
                                {wlt}
                              </Typography>
                            </Box>
                          ) : null}
                          {place ? (
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography
                                variant="overline"
                                color="text.secondary"
                                sx={{ fontSize: "0.65rem", letterSpacing: "0.08em" }}
                              >
                                Posición
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, mt: 0.25, lineHeight: 1.4 }}
                              >
                                {place}
                              </Typography>
                            </Box>
                          ) : null}
                          {deckSlugs.length > 0 ? (
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              sx={{
                                flexWrap: "wrap",
                                ml: { sm: "auto" },
                              }}
                            >
                              {deckSlugs.slice(0, 2).map((slug) => (
                                <Box
                                  key={slug}
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 44,
                                      height: 44,
                                      borderRadius: 1.5,
                                      overflow: "hidden",
                                      bgcolor: "background.paper",
                                      border: "1px solid",
                                      borderColor: "divider",
                                    }}
                                  >
                                    <Box
                                      component="img"
                                      src={getLimitlessPokemonSpriteUrl(slug)}
                                      alt=""
                                      sx={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "contain",
                                        imageRendering: "pixelated",
                                      }}
                                    />
                                  </Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      fontSize: "0.65rem",
                                      maxWidth: 72,
                                      textAlign: "center",
                                      lineHeight: 1.2,
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {slug}
                                  </Typography>
                                </Box>
                              ))}
                            </Stack>
                          ) : null}
                        </Stack>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                        Abre el detalle para reportar deck y rondas.
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}

        {!isPending && !isError && list.length > 0 && onCreateCustom ? (
          <Box sx={{ mt: 2, display: "flex", justifyContent: { xs: "stretch", sm: "flex-end" } }}>
            <Button
              variant="outlined"
              size="small"
              onClick={onCreateCustom}
              sx={{ width: { xs: "100%", sm: "auto" }, textTransform: "none", fontWeight: 700 }}
            >
              Registrar torneo custom
            </Button>
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}
