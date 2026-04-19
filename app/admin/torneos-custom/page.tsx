"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  ArrowBack,
  Person,
  Search,
  SportsEsports,
} from "@mui/icons-material";
import {
  type AdminCustomTournament,
  useAdminCustomTournaments,
} from "@/hooks/useWeeklyEvents";
import {
  getLimitlessPokemonSpriteUrl,
  limitlessSpriteDimensions,
} from "@/lib/limitless-pokemon-sprite";

const ADMIN_TABLE_SPRITE_BOX = limitlessSpriteDimensions(28);

const CATEGORY_LABELS = ["Júnior", "Sénior", "Máster"] as const;

function placementSummary(
  mp: {
    categoryIndex: number;
    place: number | null;
    isDnf: boolean;
  } | null | undefined,
): string {
  if (!mp) return "—";
  const cat =
    CATEGORY_LABELS[mp.categoryIndex] ??
    `Cat. ${mp.categoryIndex + 1}`;
  if (mp.isDnf) return `${cat} · DNF`;
  if (mp.place != null) return `${cat} · ${mp.place}º`;
  return cat;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function filterTournaments(
  list: AdminCustomTournament[],
  q: string,
): AdminCustomTournament[] {
  const t = q.trim().toLowerCase();
  if (!t) return list;
  return list.filter((row) => {
    if (row.title.toLowerCase().includes(t)) return true;
    if (row.creator?.name?.toLowerCase().includes(t)) return true;
    if (row.creator?.email?.toLowerCase().includes(t)) return true;
    if (row.creatorParticipant?.displayName.toLowerCase().includes(t))
      return true;
    return false;
  });
}

function DeckSprites({ slugs }: { slugs: string[] }) {
  const shown = slugs.slice(0, 2);
  if (shown.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      {shown.map((slug) => (
        <Tooltip key={slug} title={slug}>
          <Box
            component="img"
            className="pokemon"
            src={getLimitlessPokemonSpriteUrl(slug)}
            alt=""
            sx={{
              width: ADMIN_TABLE_SPRITE_BOX.width,
              height: ADMIN_TABLE_SPRITE_BOX.height,
              objectFit: "contain",
              imageRendering: "pixelated",
              borderRadius: 0.5,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          />
        </Tooltip>
      ))}
    </Stack>
  );
}

function TournamentCard({ row }: { row: AdminCustomTournament }) {
  const cp = row.creatorParticipant;
  const adminDetailUrl = `/admin/torneos-custom/${row._id}`;
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          {row.title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatWhen(row.startsAt)}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Person sx={{ fontSize: 18, color: "text.secondary" }} />
        <Typography variant="body2">
          {row.creator?.name ?? cp?.displayName ?? "—"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {row.participantCount} participante
          {row.participantCount === 1 ? "" : "s"}
        </Typography>
        {row.creator?.email ? (
          <Chip size="small" label={row.creator.email} variant="outlined" />
        ) : null}
      </Stack>
      {cp ? (
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Récord (reportado) · {cp.wins}-{cp.losses}-{cp.ties} ·{" "}
            {cp.matchRoundsReported} ronda
            {cp.matchRoundsReported === 1 ? "" : "s"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Posición: {placementSummary(cp.manualPlacement)}
          </Typography>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Deck (sprites)
            </Typography>
            <DeckSprites slugs={cp.deckPokemonSlugs} />
          </Box>
        </Stack>
      ) : null}
      <Button
        component={Link}
        href={adminDetailUrl}
        size="small"
        variant="contained"
        sx={{ alignSelf: "flex-start", textTransform: "none" }}
      >
        Ver
      </Button>
    </Paper>
  );
}

export default function AdminTorneosCustomPage() {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down("md"));
  const { data, isPending, isError, error, refetch } =
    useAdminCustomTournaments();
  const [query, setQuery] = useState("");

  const rows = data?.tournaments ?? [];
  const filtered = useMemo(
    () => filterTournaments(rows, query),
    [rows, query],
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Button
          component={Link}
          href="/dashboard"
          startIcon={<ArrowBack />}
          sx={{ alignSelf: "flex-start", textTransform: "none" }}
        >
          Volver al panel
        </Button>

        <Box
          sx={{
            borderRadius: 2,
            p: { xs: 2.5, sm: 3 },
            background: (t) =>
              `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.12)} 0%, ${alpha(t.palette.primary.dark, 0.06)} 100%)`,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <SportsEsports
                sx={{ fontSize: 40, color: "primary.main", opacity: 0.9 }}
              />
              <Box>
                <Typography variant="h5" component="h1" fontWeight={700}>
                  Torneos custom
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Torneos Pokémon creados por usuarios (no aparecen en el
                  calendario público de la tienda). Solo lectura; la gestión la
                  hace cada jugador en «Mis torneos».
                </Typography>
              </Box>
            </Stack>
            <Chip
              label={`${rows.length} en total`}
              color="primary"
              variant="outlined"
            />
          </Stack>
        </Box>

        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre del torneo, jugador o correo…"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
          }}
          size="small"
        />

        {isPending ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : null}

        {isError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          >
            {error instanceof Error ? error.message : "No se pudo cargar."}
          </Alert>
        ) : null}

        {!isPending && !isError && rows.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              Aún no hay torneos custom registrados.
            </Typography>
          </Paper>
        ) : null}

        {!isPending && !isError && rows.length > 0 && filtered.length === 0 ? (
          <Alert severity="info">Ningún resultado para esa búsqueda.</Alert>
        ) : null}

        {!isPending && !isError && filtered.length > 0 ? (
          isNarrow ? (
            <Stack spacing={2}>
              {filtered.map((row) => (
                <TournamentCard key={row._id} row={row} />
              ))}
            </Stack>
          ) : (
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Torneo</TableCell>
                    <TableCell>Fecha del torneo</TableCell>
                    <TableCell>Creador / participantes</TableCell>
                    <TableCell align="center">Récord</TableCell>
                    <TableCell align="center">Rondas</TableCell>
                    <TableCell>Posición</TableCell>
                    <TableCell>Deck</TableCell>
                    <TableCell align="right">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((row) => {
                    const cp = row.creatorParticipant;
                    const adminDetailUrl = `/admin/torneos-custom/${row._id}`;
                    return (
                      <TableRow key={row._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {row.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Registro: {formatWhen(row.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {formatWhen(row.startsAt)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {row.creator?.name ?? cp?.displayName ?? "—"}
                          </Typography>
                          {row.creator?.email ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              {row.creator.email}
                            </Typography>
                          ) : null}
                          <Typography variant="caption" color="text.secondary">
                            {row.participantCount} participante
                            {row.participantCount === 1 ? "" : "s"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {cp ? (
                            <Typography variant="body2" fontWeight={500}>
                              {cp.wins}-{cp.losses}-{cp.ties}
                            </Typography>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {cp ? cp.matchRoundsReported : "—"}
                        </TableCell>
                        <TableCell>
                          {cp
                            ? placementSummary(cp.manualPlacement)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <DeckSprites
                            slugs={cp?.deckPokemonSlugs ?? []}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            component={Link}
                            href={adminDetailUrl}
                            size="small"
                            variant="outlined"
                            sx={{ textTransform: "none" }}
                          >
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )
        ) : null}
      </Stack>
    </Container>
  );
}
