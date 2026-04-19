"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { alpha, useTheme, type Theme } from "@mui/material/styles";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import Header from "@/components/Header";
import { usePublicLeague } from "@/hooks/useWeeklyEvents";
import { LEAGUE_PUBLIC_INFO_ALERT_PARAGRAPHS } from "@/lib/league-public-copy";
import { categoryLabelEs } from "@/lib/weekly-event-public";

function shortName(s: string, max = 18) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export default function LigaPublicPage() {
  const theme = useTheme();
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { data, isPending, isError, error, refetch } = usePublicLeague(slug);

  const [categoryTab, setCategoryTab] = useState(0);

  useEffect(() => {
    setCategoryTab(0);
  }, [slug]);

  const blocks = data?.standingsByCategory ?? [];
  const safeTab = Math.min(categoryTab, Math.max(0, blocks.length - 1));
  const currentBlock = blocks[safeTab];

  const chartData = useMemo(() => {
    if (!currentBlock) return [];
    return currentBlock.chartTop.map((r) => ({
      name: shortName(r.name, 14),
      fullName: r.name,
      puntos: r.points,
    }));
  }, [currentBlock]);

  const hasAnyStandings = blocks.some((b) => b.standings.length > 0);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
        <Stack spacing={2.5}>
          <Button
            component={Link}
            href="/dashboard"
            variant="text"
            size="small"
            sx={{ alignSelf: "flex-start", fontWeight: 600 }}
          >
            Volver al panel
          </Button>

          {isPending ? (
            <Typography color="text.secondary">Cargando clasificación…</Typography>
          ) : isError ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => refetch()}>
                  Reintentar
                </Button>
              }
            >
              {error instanceof Error ? error.message : "Error"}
            </Alert>
          ) : data ? (
            <>
              <Box>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{ fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}
                >
                  {data.league.name}
                </Typography>
                {data.league.description ? (
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mt: 1.5, maxWidth: 720, lineHeight: 1.65, whiteSpace: "pre-wrap" }}
                  >
                    {data.league.description}
                  </Typography>
                ) : null}
              </Box>

              <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                <Stack spacing={1.25}>
                  {LEAGUE_PUBLIC_INFO_ALERT_PARAGRAPHS.map((paragraph, i) => (
                    <Typography key={i} variant="body2" sx={{ lineHeight: 1.65 }}>
                      {paragraph}
                    </Typography>
                  ))}
                </Stack>
              </Alert>

              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.08),
                }}
              >
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, mb: 2 }}>
                  Resumen
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={2} useFlexGap sx={{ typography: "body2" }}>
                  <span>
                    <strong>Torneos en la liga:</strong> {data.tournaments.length}
                  </span>
                  <span>
                    <strong>Con clasificación:</strong>{" "}
                    {data.tournaments.filter((t) => t.hasStandings).length}
                  </span>
                  <span>
                    <strong>Puntos por posición:</strong>{" "}
                    {data.league.pointsByPlace.slice(0, 8).join(" / ")}
                    {data.league.pointsByPlace.length > 8 ? " / …" : ""}
                  </span>
                  {data.league.countBestEvents != null && data.league.countBestEvents > 0 ? (
                    <span>
                      <strong>Regla:</strong> solo cuentan los {data.league.countBestEvents} mejores torneos por
                      jugador y categoría
                    </span>
                  ) : (
                    <span>
                      <strong>Regla:</strong> suman todos los torneos cerrados (por categoría)
                    </span>
                  )}
                </Stack>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.08),
                  overflow: "hidden",
                }}
              >
                <Box sx={{ borderBottom: 1, borderColor: "divider", px: { xs: 1, sm: 2 } }}>
                  <Tabs
                    value={safeTab}
                    onChange={(_, v) => setCategoryTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="División de edad"
                  >
                    {blocks.map((b) => (
                      <Tab
                        key={b.categoryIndex}
                        label={categoryLabelEs(b.categoryIndex)}
                        id={`liga-cat-tab-${b.categoryIndex}`}
                        aria-controls={`liga-cat-panel-${b.categoryIndex}`}
                      />
                    ))}
                  </Tabs>
                </Box>

                {currentBlock ? (
                  <Box
                    role="tabpanel"
                    id={`liga-cat-panel-${currentBlock.categoryIndex}`}
                    aria-labelledby={`liga-cat-tab-${currentBlock.categoryIndex}`}
                  >
                    {chartData.length > 0 ? (
                      <Box sx={{ p: { xs: 2, sm: 2.5 }, pb: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                          Top jugadores — {categoryLabelEs(currentBlock.categoryIndex)}
                        </Typography>
                        <Box sx={{ width: "100%", height: 320 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 32 }}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                              <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11 }}
                                interval={0}
                                angle={-25}
                                textAnchor="end"
                                height={60}
                              />
                              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                              <RechartsTooltip
                                formatter={(value) => [value ?? 0, "Puntos"]}
                                labelFormatter={(_, payload) => {
                                  const p = payload?.[0]?.payload as { fullName?: string } | undefined;
                                  return p?.fullName ?? "";
                                }}
                              />
                              <Bar
                                dataKey="puntos"
                                fill={theme.palette.primary.main}
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      </Box>
                    ) : null}

                    <Box sx={{ px: 2, py: 1.5, bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
                      <Typography variant="subtitle1" fontWeight={800}>
                        Clasificación — {categoryLabelEs(currentBlock.categoryIndex)}
                      </Typography>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>Jugador</TableCell>
                            <TableCell align="right">Puntos</TableCell>
                            <TableCell align="right">Torneos</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {currentBlock.standings.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4}>
                                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                  {hasAnyStandings
                                    ? "Sin resultados en esta división todavía."
                                    : "Aún no hay puntos: asigna torneos cerrados con clasificación importada a esta liga."}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            currentBlock.standings.map((row, idx) => (
                              <TableRow key={row.popId} hover>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{row.displayName}</TableCell>
                                <TableCell align="right">{row.totalPoints}</TableCell>
                                <TableCell align="right">{row.eventsPlayed}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ) : null}
              </Paper>

              {blocks.some((b) => b.standings.some((s) => s.events.length > 0)) ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.08),
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
                    Detalle por jugador — {categoryLabelEs(currentBlock?.categoryIndex ?? 0)}
                  </Typography>
                  {currentBlock && currentBlock.standings.some((s) => s.events.length > 0) ? (
                    <Stack spacing={2}>
                      {currentBlock.standings
                        .filter((s) => s.events.length > 0)
                        .map((row) => (
                          <Box key={row.popId}>
                            <Typography fontWeight={700}>
                              {row.displayName}{" "}
                              <Typography component="span" variant="body2" color="text.secondary" fontWeight={500}>
                                ({row.totalPoints} pts)
                              </Typography>
                            </Typography>
                            <Stack component="ul" sx={{ m: 0, pl: 2.5, mt: 0.5 }} spacing={0.25}>
                              {row.events.map((ev) => (
                                <Typography
                                  key={`${ev.eventId}-${ev.categoryIndex}-${ev.place}`}
                                  component="li"
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {new Date(ev.startsAt).toLocaleDateString("es-CL", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}{" "}
                                  · {ev.title} · {categoryLabelEs(ev.categoryIndex)} · Puesto {ev.place} (
                                  {ev.points} pts)
                                </Typography>
                              ))}
                            </Stack>
                          </Box>
                        ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No hay detalle de torneos en esta división.
                    </Typography>
                  )}
                </Paper>
              ) : null}
            </>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
