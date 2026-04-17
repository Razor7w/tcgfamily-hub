"use client";

import {
  useCallback,
  useMemo,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type Key,
} from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TableRowsOutlinedIcon from "@mui/icons-material/TableRowsOutlined";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import WavingHandOutlinedIcon from "@mui/icons-material/WavingHandOutlined";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import {
  matchRecordFromRounds,
  roundTableOutcome,
  summarizeRoundResult,
  type GameResultLetter,
  type ParticipantMatchRoundDTO,
  type SpecialRoundOutcome,
  type TurnOrder,
} from "@/lib/participant-match-round";
import { getLimitlessPokemonSpriteUrl } from "@/lib/limitless-pokemon-sprite";
import {
  type PokemonSpeciesOption,
  usePokemonSpeciesOptions,
} from "@/hooks/usePokemonSpeciesOptions";
import { useSaveMyMatchRounds } from "@/hooks/useWeeklyEvents";
import type { WeeklyEventState } from "@/models/WeeklyEvent";

const filter = createFilterOptions<PokemonSpeciesOption>({
  stringify: (o) => `${o.label} ${o.slug}`,
});

/** Verde para victorias en mesa (legible sobre fondo). */
const MATCH_WIN_COLOR = "#15803d";
/** Tono rojo para derrotas (mesas). */
const MATCH_LOSS_COLOR = "#dc2626";
/** Tono naranja/dorado para empates (mesas). */
const MATCH_TIE_COLOR = "#ca8a04";

/**
 * Si aún no hay récord oficial con partidos (0-0-0) o no llega `officialMatchRecord`,
 * se permite un tope alto para la bitácora hasta que exista W+L+T.
 */
const FALLBACK_MAX_SELF_REPORTED_ROUNDS = 15;

type RowOutcome = ReturnType<typeof roundTableOutcome>;

function matchRowAccentParts(outcome: RowOutcome): {
  bgcolor: string;
  borderLeftColor: string;
  hoverBg: string;
} {
  if (outcome === "win") {
    return {
      bgcolor: alpha(MATCH_WIN_COLOR, 0.16),
      borderLeftColor: MATCH_WIN_COLOR,
      hoverBg: alpha(MATCH_WIN_COLOR, 0.4),
    };
  }
  if (outcome === "loss") {
    return {
      bgcolor: alpha(MATCH_LOSS_COLOR, 0.14),
      borderLeftColor: MATCH_LOSS_COLOR,
      hoverBg: alpha(MATCH_LOSS_COLOR, 0.38),
    };
  }
  if (outcome === "tie") {
    return {
      bgcolor: alpha(MATCH_TIE_COLOR, 0.2),
      borderLeftColor: MATCH_TIE_COLOR,
      hoverBg: alpha(MATCH_TIE_COLOR, 0.44),
    };
  }
  return {
    bgcolor: "transparent",
    borderLeftColor: "transparent",
    hoverBg: "",
  };
}

function resultPillSx(outcome: RowOutcome) {
  if (outcome === "win") {
    return {
      color: MATCH_WIN_COLOR,
      bgcolor: alpha(MATCH_WIN_COLOR, 0.2),
      border: `1px solid ${alpha(MATCH_WIN_COLOR, 0.45)}`,
    };
  }
  if (outcome === "loss") {
    return {
      color: MATCH_LOSS_COLOR,
      bgcolor: alpha(MATCH_LOSS_COLOR, 0.18),
      border: `1px solid ${alpha(MATCH_LOSS_COLOR, 0.45)}`,
    };
  }
  if (outcome === "tie") {
    return {
      color: MATCH_TIE_COLOR,
      bgcolor: alpha(MATCH_TIE_COLOR, 0.22),
      border: `1px solid ${alpha(MATCH_TIE_COLOR, 0.5)}`,
    };
  }
  return {
    color: "text.primary",
    bgcolor: "action.hover",
    border: "1px solid",
    borderColor: "divider",
  };
}

/** Contenedor fijo + `object-fit: contain` para no deformar sprites pixel-art (suelen ser rectangulares). */
function LimitlessSpriteThumb({
  slug,
  size,
  circular = false,
}: {
  slug: string;
  size: number;
  circular?: boolean;
}) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: circular ? "50%" : 1,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          objectPosition: "center",
          imageRendering: "pixelated",
        }}
      />
    </Box>
  );
}

type AutocompleteLiProps = HTMLAttributes<HTMLLIElement> & { key?: Key };

function renderPokemonOption(
  props: AutocompleteLiProps,
  option: PokemonSpeciesOption,
) {
  const { key, children, ...rest } = props;
  void children;
  return (
    <li key={key ?? option.slug} {...rest}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LimitlessSpriteThumb slug={option.slug} size={28} />
        <Typography variant="body2">{option.label}</Typography>
      </Box>
    </li>
  );
}

/** Lista compacta en viewport estrecho: evita tabla horizontal y mejora toques. */
function RoundMobileCard({
  row,
  slugToLabel,
  onEdit,
  onDelete,
  deleteDisabled,
}: {
  row: ParticipantMatchRoundDTO;
  slugToLabel: Map<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
}) {
  const outcome = roundTableOutcome(row);
  const p = matchRowAccentParts(outcome);
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
      aria-label={`Editar ronda ${row.roundNum}`}
      sx={(t) => ({
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        borderLeft: "4px solid",
        borderLeftColor: p.borderLeftColor,
        bgcolor: p.bgcolor,
        p: { xs: 1.5, sm: 1.75 },
        cursor: "pointer",
        transition: "background-color 0.15s ease",
        outlineOffset: 2,
        WebkitTapHighlightColor: "transparent",
        "&:focus-visible": {
          outline: `2px solid ${t.palette.primary.main}`,
        },
        "&:hover": {
          bgcolor:
            outcome !== "neutral" && p.hoverBg
              ? p.hoverBg
              : t.palette.action.hover,
        },
      })}
    >
      <Stack
        direction="row"
        spacing={1.25}
        alignItems="flex-start"
        justifyContent="space-between"
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={700}
            sx={{
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              display: "block",
              mb: 0.75,
            }}
          >
            Ronda {row.roundNum}
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            {row.specialOutcome ? (
              <Chip size="small" label={summarizeRoundResult(row)} />
            ) : row.opponentDeckSlugs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                —
              </Typography>
            ) : (
              row.opponentDeckSlugs.map((slug) => (
                <Tooltip
                  key={slug}
                  title={slugToLabel.get(slug) ?? slug}
                  placement="top"
                >
                  <Box sx={{ cursor: "default", display: "inline-flex" }}>
                    <LimitlessSpriteThumb slug={slug} size={36} />
                  </Box>
                </Tooltip>
              ))
            )}
          </Stack>
        </Box>
        <Stack
          direction="row"
          spacing={0.25}
          alignItems="flex-start"
          flexShrink={0}
        >
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 44,
              minHeight: 40,
              px: 1.25,
              py: 0.5,
              borderRadius: 2,
              fontWeight: 800,
              fontSize: "0.8125rem",
              letterSpacing: "0.04em",
              lineHeight: 1.2,
              ...resultPillSx(outcome),
            }}
          >
            {summarizeRoundResult(row)}
          </Box>
          <IconButton
            size="medium"
            aria-label="Eliminar ronda"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={deleteDisabled}
            sx={{ mt: -0.25 }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    </Box>
  );
}

function subtypeLabel(s: string | null): string | null {
  if (!s) return null;
  if (s === "casual") return "Casual";
  if (s === "cup") return "Cup";
  if (s === "challenge") return "Challenge";
  return s;
}

function eventStateLabel(s: WeeklyEventState): string {
  if (s === "schedule") return "Programado";
  if (s === "running") return "En curso";
  return "Finalizado";
}

function eventStateChipColor(
  s: WeeklyEventState,
): "default" | "primary" | "success" | "warning" {
  if (s === "schedule") return "default";
  if (s === "running") return "warning";
  return "success";
}

type GameRowState = {
  result: GameResultLetter | null;
  turn: TurnOrder | null;
};

function isTwoGameDecisive(a: GameResultLetter, b: GameResultLetter): boolean {
  return (a === "W" && b === "W") || (a === "L" && b === "L");
}

/**
 * Tras marcar el juego 1 aparece el juego 2. El juego 3 solo si los dos primeros
 * no cierran la mesa (cualquier cosa que no sea WW ni LL requiere desempate).
 */
function reconcileMatchGames(prev: GameRowState[]): GameRowState[] {
  const g0 = prev[0] ?? { result: null, turn: null };
  const r0 = g0.result;
  if (r0 == null) {
    return [{ result: null, turn: null }];
  }
  const g1 = prev[1] ?? { result: null, turn: null };
  const r1 = g1.result;
  const row0 = { ...g0 };
  if (r1 == null) {
    return [row0, { result: null, turn: null }];
  }
  const row1 = { ...g1 };
  if (isTwoGameDecisive(r0, r1)) {
    return [row0, row1];
  }
  const g2 = prev[2] ?? { result: null, turn: null };
  return [row0, row1, { ...g2 }];
}

/** null = incompleto (falta desempate u obligatorio). */
function buildGameResultsForSave(rows: GameRowState[]): GameResultLetter[] | null {
  const results: GameResultLetter[] = [];
  for (const row of rows) {
    if (row.result == null) break;
    results.push(row.result);
  }
  if (results.length === 0) return null;
  if (results.length >= 2) {
    const a = results[0];
    const b = results[1];
    if (!isTwoGameDecisive(a, b) && results.length < 3) return null;
  }
  return results;
}

export type TournamentPlacementInfo = {
  categoryIndex: number;
  categoryLabel: string;
  place: number | null;
  isDnf: boolean;
};

type Props = {
  eventId: string;
  title: string;
  startsAtIso: string;
  location: string;
  pokemonSubtype: string | null;
  myDeckSlugs: string[];
  rounds: ParticipantMatchRoundDTO[];
  /** Estado del evento (chip junto al título). */
  eventState?: WeeklyEventState;
  /** Récord W‑L‑T del participante según TDF / admin (solo relevante si el torneo está cerrado). */
  officialMatchRecord?: { wins: number; losses: number; ties: number } | null;
  /** Puesto en standings importados (solo si hay datos y coincide tu POP). */
  tournamentPlacement?: TournamentPlacementInfo | null;
};

export default function TournamentMatchRoundsCard({
  eventId,
  title,
  startsAtIso,
  location,
  pokemonSubtype,
  myDeckSlugs,
  rounds,
  eventState,
  officialMatchRecord,
  tournamentPlacement,
}: Props) {
  const { data: allOptions = [], isPending: optionsLoading } =
    usePokemonSpeciesOptions();
  const saveRounds = useSaveMyMatchRounds(eventId);

  const [formOpen, setFormOpen] = useState(false);
  /** `null` = modo añadir; número = editar esa ronda. */
  const [editingRoundNum, setEditingRoundNum] = useState<number | null>(null);
  const [slot1, setSlot1] = useState<PokemonSpeciesOption | null>(null);
  const [slot2, setSlot2] = useState<PokemonSpeciesOption | null>(null);
  const [special, setSpecial] = useState<SpecialRoundOutcome | "none">("none");
  const [games, setGames] = useState<GameRowState[]>([
    { result: null, turn: null },
  ]);

  const isEditing = editingRoundNum != null;

  const nextRoundNum = useMemo(() => {
    if (rounds.length === 0) return 1;
    return Math.max(...rounds.map((r) => r.roundNum)) + 1;
  }, [rounds]);

  const formRoundLabel = isEditing ? editingRoundNum : nextRoundNum;

  /**
   * Máximo de filas en la bitácora = partidos jugados según récord oficial (W+L+T).
   * Ej.: 1-3-0 → 4 rondas; 2-2-1 → 5.
   */
  const maxSelfReportedRounds = useMemo(() => {
    if (officialMatchRecord != null) {
      const sum =
        officialMatchRecord.wins +
        officialMatchRecord.losses +
        officialMatchRecord.ties;
      if (sum > 0) return sum;
      if (eventState === "close") return 0;
    }
    return FALLBACK_MAX_SELF_REPORTED_ROUNDS;
  }, [officialMatchRecord, eventState]);

  const canAddRound = rounds.length < maxSelfReportedRounds;
  /** Mostrar el botón del formulario: añadir ronda, o cerrar si el panel está abierto (p. ej. editando al límite). */
  const showRoundFormToggle = canAddRound || formOpen;

  const showOfficialRecord =
    eventState === "close" && officialMatchRecord != null;

  const record = useMemo(() => {
    if (eventState === "close" && officialMatchRecord != null) {
      return {
        wins: officialMatchRecord.wins,
        losses: officialMatchRecord.losses,
        ties: officialMatchRecord.ties,
      };
    }
    return matchRecordFromRounds(rounds);
  }, [eventState, officialMatchRecord, rounds]);

  const slugToLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of allOptions) m.set(o.slug, o.label);
    return m;
  }, [allOptions]);

  /** Fila que se está editando (para resolver rivales si `allOptions` llega después). */
  const editingRoundRow = useMemo(() => {
    if (editingRoundNum == null) return undefined;
    return rounds.find((r) => r.roundNum === editingRoundNum);
  }, [editingRoundNum, rounds]);

  const slot1Resolved = useMemo((): PokemonSpeciesOption | null => {
    const slug = editingRoundRow?.opponentDeckSlugs?.[0];
    if (!slug || allOptions.length === 0) return null;
    return allOptions.find((o) => o.slug === slug) ?? null;
  }, [editingRoundRow, allOptions]);

  const slot2Resolved = useMemo((): PokemonSpeciesOption | null => {
    const slug = editingRoundRow?.opponentDeckSlugs?.[1];
    if (!slug || allOptions.length === 0) return null;
    return allOptions.find((o) => o.slug === slug) ?? null;
  }, [editingRoundRow, allOptions]);

  const slot1Value = slot1 ?? slot1Resolved;
  const slot2Value = slot2 ?? slot2Resolved;

  const optionsForSlot1 = useMemo(
    () => allOptions.filter((o) => o.slug !== slot2Value?.slug),
    [allOptions, slot2Value?.slug],
  );
  const optionsForSlot2 = useMemo(
    () => allOptions.filter((o) => o.slug !== slot1Value?.slug),
    [allOptions, slot1Value?.slug],
  );

  const resetForm = () => {
    setEditingRoundNum(null);
    setSlot1(null);
    setSlot2(null);
    setSpecial("none");
    setGames([{ result: null, turn: null }]);
  };

  const hydrateFormFromRound = useCallback(
    (row: ParticipantMatchRoundDTO) => {
      if (row.specialOutcome) {
        setSpecial(row.specialOutcome);
        setGames([{ result: null, turn: null }]);
        setSlot1(null);
        setSlot2(null);
        return;
      }
      setSpecial("none");
      if (row.gameResults.length === 0) {
        setGames(reconcileMatchGames([{ result: null, turn: null }]));
      } else {
        const gr: GameRowState[] = row.gameResults.map((res, i) => ({
          result: res,
          turn: row.turnOrders[i] ?? null,
        }));
        setGames(reconcileMatchGames(gr));
      }
      setSlot1(null);
      setSlot2(null);
    },
    [],
  );

  const openEditRound = useCallback(
    (row: ParticipantMatchRoundDTO) => {
      setEditingRoundNum(row.roundNum);
      setFormOpen(true);
      hydrateFormFromRound(row);
    },
    [hydrateFormFromRound],
  );

  const patchGame = (idx: number, patch: Partial<GameRowState>) => {
    setGames((prev) => {
      const next: GameRowState[] = [...prev];
      while (next.length <= idx) {
        next.push({ result: null, turn: null });
      }
      next[idx] = { ...next[idx], ...patch };
      return reconcileMatchGames(next);
    });
  };

  const gameRows = useMemo(() => reconcileMatchGames(games), [games]);
  const needsTiebreakResult = useMemo(() => {
    const r0 = gameRows[0]?.result;
    const r1 = gameRows[1]?.result;
    const r2 = gameRows[2]?.result;
    if (r0 == null || r1 == null) return false;
    if (isTwoGameDecisive(r0, r1)) return false;
    return r2 == null;
  }, [gameRows]);

  const canSaveNormalRound = useMemo(() => {
    const r = buildGameResultsForSave(gameRows);
    return r != null && r.length >= 1;
  }, [gameRows]);

  const handleSaveRound = () => {
    if (!isEditing && rounds.length >= maxSelfReportedRounds) return;

    const targetRoundNum = isEditing ? editingRoundNum! : nextRoundNum;
    const previous =
      isEditing && editingRoundNum != null
        ? rounds.find((x) => x.roundNum === editingRoundNum)
        : undefined;

    if (special !== "none") {
      const r: ParticipantMatchRoundDTO = {
        ...(previous?.id ? { id: previous.id } : {}),
        roundNum: targetRoundNum,
        opponentDeckSlugs: [],
        gameResults: [],
        turnOrders: [],
        specialOutcome: special,
      };
      const nextList = isEditing
        ? rounds.map((x) => (x.roundNum === editingRoundNum ? r : x))
        : [...rounds, r];
      saveRounds.mutate(nextList, {
        onSuccess: () => {
          resetForm();
          setFormOpen(false);
        },
      });
      return;
    }

    const rows = reconcileMatchGames(games);
    const results = buildGameResultsForSave(rows);
    if (results == null || results.length < 1) return;

    const turns: TurnOrder[] = [];
    for (let i = 0; i < results.length; i++) {
      const t = rows[i]?.turn;
      if (t === "first" || t === "second") turns.push(t);
    }
    const opp = [slot1Value?.slug, slot2Value?.slug].filter(
      (s): s is string => typeof s === "string" && s.length > 0,
    );

    const r: ParticipantMatchRoundDTO = {
      ...(previous?.id ? { id: previous.id } : {}),
      roundNum: targetRoundNum,
      opponentDeckSlugs: opp,
      gameResults: results,
      turnOrders: turns.length === results.length ? turns : [],
      specialOutcome: null,
    };

    const nextList = isEditing
      ? rounds.map((x) => (x.roundNum === editingRoundNum ? r : x))
      : [...rounds, r];
    saveRounds.mutate(nextList, {
      onSuccess: () => {
        resetForm();
        setFormOpen(false);
      },
    });
  };

  const handleDeleteRound = (roundNum: number) => {
    if (editingRoundNum === roundNum) {
      resetForm();
      setFormOpen(false);
    }
    const next = rounds.filter((x) => x.roundNum !== roundNum);
    saveRounds.mutate(next);
  };

  const dateStr = useMemo(
    () =>
      new Date(startsAtIso).toLocaleDateString("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [startsAtIso],
  );

  const st = subtypeLabel(pokemonSubtype);

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: { xs: 2.5, sm: 3 },
        border: "1px solid",
        borderColor: (t) => alpha(t.palette.text.primary, 0.08),
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          background: (t) =>
            `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${alpha(
              t.palette.primary.dark,
              0.02,
            )} 100%)`,
        }}
      >
        <Stack spacing={{ xs: 2, sm: 2.25 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "flex-start" }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{ mb: 0.75 }}
              >
                <Typography
                  variant="h5"
                  fontWeight={800}
                  component="h2"
                  sx={{
                    m: 0,
                    fontSize: { xs: "1.2rem", sm: "1.5rem" },
                    lineHeight: 1.25,
                  }}
                >
                  {title}
                </Typography>
                {eventState ? (
                  <Chip
                    size="small"
                    label={eventStateLabel(eventState)}
                    color={eventStateChipColor(eventState)}
                    sx={{ fontWeight: 700 }}
                  />
                ) : null}
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5, lineHeight: 1.5 }}
              >
                {dateStr}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {location ? (
                  <Chip
                    size="small"
                    icon={<PlaceOutlinedIcon sx={{ fontSize: 16 }} />}
                    label={location}
                    variant="outlined"
                    sx={{ maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }}
                  />
                ) : null}
                {st ? (
                  <Chip size="small" label={st} color="primary" variant="outlined" />
                ) : null}
                <Chip size="small" label="Torneo Pokémon" variant="outlined" />
              </Stack>
            </Box>
            <Stack
              alignItems={{ xs: "stretch", md: "flex-end" }}
              spacing={1.25}
              sx={{
                flexShrink: 0,
                width: { xs: "100%", md: "auto" },
                p: { xs: 1.75, sm: 2 },
                borderRadius: 2,
                border: "1px solid",
                borderColor: (t) => alpha(t.palette.primary.main, 0.2),
                bgcolor: (t) => alpha(t.palette.primary.main, 0.05),
                minWidth: { md: 220 },
              }}
            >
              <Stack
                direction={{ xs: "row", md: "column" }}
                spacing={{ xs: 2, md: 1.25 }}
                alignItems={{ xs: "center", md: "flex-end" }}
                justifyContent={{ xs: "space-between", md: "flex-end" }}
              >
                <Box sx={{ textAlign: { xs: "left", md: "right" }, minWidth: 0 }}>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ lineHeight: 1.2, letterSpacing: "0.08em", display: "block" }}
                  >
                    {showOfficialRecord ? "Récord oficial" : "Tu récord"}
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: 1.1,
                      fontSize: { xs: "1.65rem", sm: "2.125rem" },
                    }}
                  >
                    {record.wins}-{record.losses}-{record.ties}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "block",
                      mt: 0.25,
                      maxWidth: { xs: "min(100%, 200px)", md: "none" },
                    }}
                  >
                    {showOfficialRecord
                      ? "Victorias · Derrotas · Empates (torneo / TDF)"
                      : "Victorias · Derrotas · Tablas (mesas que reportaste)"}
                  </Typography>
                </Box>
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ pt: { xs: 0, md: 0.5 }, flexShrink: 0 }}
                  justifyContent="flex-end"
                >
                  {myDeckSlugs.length > 0 ? (
                    myDeckSlugs.map((slug) => (
                      <LimitlessSpriteThumb key={slug} slug={slug} size={40} circular />
                    ))
                  ) : (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontStyle="italic"
                      sx={{ textAlign: { xs: "right", lg: "right" }, maxWidth: 120 }}
                    >
                      Sin Pokémon en perfil
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Stack>
          </Stack>

          {eventState === "close" && tournamentPlacement ? (
            <Box
              sx={(t) => ({
                py: { xs: 1.25, sm: 1.5 },
                px: { xs: 1.5, sm: 2 },
                borderRadius: 2,
                bgcolor: alpha(t.palette.success.main, 0.08),
                border: "1px solid",
                borderColor: alpha(t.palette.success.main, 0.35),
              })}
            >
              <Stack direction="row" spacing={1.25} alignItems="flex-start">
                <EmojiEventsIcon
                  sx={{
                    color: "success.main",
                    fontSize: { xs: 20, sm: 22 },
                    mt: 0.25,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    sx={{ display: "block", mb: 0.5 }}
                  >
                    Resultado en clasificación
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ overflowWrap: "anywhere" }}>
                    {tournamentPlacement.isDnf ? (
                      <>
                        Categoría{" "}
                        <Box component="strong" fontWeight={700}>
                          {tournamentPlacement.categoryLabel}
                        </Box>
                        :{" "}
                        <Box component="span" fontWeight={800} color="error.main">
                          DNF
                        </Box>{" "}
                        (no terminó el torneo)
                      </>
                    ) : (
                      <>
                        Puesto{" "}
                        <Box component="strong" fontWeight={800} color="success.dark">
                          {tournamentPlacement.place}º
                        </Box>{" "}
                        en categoría{" "}
                        <Box component="strong" fontWeight={700}>
                          {tournamentPlacement.categoryLabel}
                        </Box>
                      </>
                    )}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          ) : eventState === "close" && !tournamentPlacement ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", px: { xs: 0, sm: 0.5 }, lineHeight: 1.5 }}
            >
              Si no ves tu puesto, revisa que tu POP ID coincida con el del torneo importado.
            </Typography>
          ) : null}
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
        <Typography
          variant="subtitle1"
          fontWeight={800}
          sx={{ mb: 0.5, letterSpacing: "-0.01em", fontSize: { xs: "1rem", sm: "1.25rem" } }}
        >
          Rondas
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: showOfficialRecord ? 1 : 2, lineHeight: 1.55 }}
        >
          {rounds.length === 0
            ? "El emparejamiento oficial no se muestra aquí: puedes llevar tu propio registro de mesas."
            : "Pulsa una fila o tarjeta para editarla."}
        </Typography>
        {showOfficialRecord ? (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block", lineHeight: 1.5 }}>
            Lo que guardes en esta tabla es solo tu bitácora; no sustituye el récord oficial del torneo
            (arriba).
          </Typography>
        ) : null}

        {rounds.length === 0 ? (
          <Box
            sx={(t) => ({
              mb: 2,
              p: 3,
              borderRadius: 2,
              textAlign: "center",
              border: "2px dashed",
              borderColor: alpha(t.palette.primary.main, 0.35),
              bgcolor: alpha(t.palette.primary.main, 0.04),
            })}
          >
            <TableRowsOutlinedIcon
              color="primary"
              sx={{
                fontSize: 44,
                opacity: 0.9,
                mb: 1,
              }}
            />
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>
              Aún no hay rondas registradas
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2, maxWidth: 440, mx: "auto", lineHeight: 1.6 }}
            >
              Cuando juegues una mesa, añádela aquí: rival (opcional), resultado por juego y
              desenlaces como ID o bye.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              Usa el botón de abajo para crear la primera ronda.
            </Typography>
          </Box>
        ) : (
          <>
            <Stack spacing={1.25} sx={{ display: { xs: "flex", sm: "none" }, mb: 2 }}>
              {rounds.map((row) => (
                <RoundMobileCard
                  key={row.roundNum}
                  row={row}
                  slugToLabel={slugToLabel}
                  onEdit={() => openEditRound(row)}
                  onDelete={() => handleDeleteRound(row.roundNum)}
                  deleteDisabled={saveRounds.isPending}
                />
              ))}
            </Stack>
            <TableContainer
              sx={{
                mb: 2,
                display: { xs: "none", sm: "block" },
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
              }}
            >
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={(t) => ({
                    bgcolor: alpha(t.palette.text.primary, 0.04),
                    "& .MuiTableCell-head": {
                      fontWeight: 700,
                      color: "text.secondary",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    },
                  })}
                >
                  <TableCell width={72}>Ronda</TableCell>
                  <TableCell>Deck rival</TableCell>
                  <TableCell width={120} align="right">
                    Resultado
                  </TableCell>
                  <TableCell width={48} />
                </TableRow>
              </TableHead>
              <TableBody>
                {rounds.map((row) => {
                  const outcome = roundTableOutcome(row);
                  return (
                    <TableRow
                      key={row.roundNum}
                      onClick={() => openEditRound(row)}
                      onKeyDown={(e: KeyboardEvent<HTMLTableRowElement>) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openEditRound(row);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Editar ronda ${row.roundNum}`}
                      sx={(t) => {
                        const p = matchRowAccentParts(outcome);
                        return {
                          cursor: "pointer",
                          borderLeft: "4px solid",
                          borderLeftColor: p.borderLeftColor,
                          bgcolor: p.bgcolor,
                          transition: "background-color 0.15s ease",
                          outlineOffset: -2,
                          "&:focus-visible": {
                            outline: `2px solid ${t.palette.primary.main}`,
                          },
                          "&:hover": {
                            bgcolor:
                              outcome !== "neutral" && p.hoverBg
                                ? p.hoverBg
                                : t.palette.action.hover,
                          },
                        };
                      }}
                    >
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography
                          fontWeight={800}
                          variant="body2"
                          color={
                            outcome === "win"
                              ? undefined
                              : outcome === "loss" || outcome === "tie"
                                ? undefined
                                : "text.secondary"
                          }
                          sx={
                            outcome === "win"
                              ? { color: MATCH_WIN_COLOR }
                              : outcome === "loss"
                                ? { color: MATCH_LOSS_COLOR }
                                : outcome === "tie"
                                  ? { color: MATCH_TIE_COLOR }
                                  : undefined
                          }
                        >
                          {row.roundNum}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                          {row.specialOutcome ? (
                            <Chip size="small" label={summarizeRoundResult(row)} />
                          ) : row.opponentDeckSlugs.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          ) : (
                            row.opponentDeckSlugs.map((slug) => (
                              <Tooltip
                                key={slug}
                                title={slugToLabel.get(slug) ?? slug}
                                placement="top"
                              >
                                <Box sx={{ cursor: "default", display: "inline-flex" }}>
                                  <LimitlessSpriteThumb slug={slug} size={32} />
                                </Box>
                              </Tooltip>
                            ))
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 44,
                            px: 1.25,
                            py: 0.5,
                            borderRadius: 2,
                            fontWeight: 800,
                            fontSize: "0.8125rem",
                            letterSpacing: "0.04em",
                            lineHeight: 1.2,
                            ...resultPillSx(outcome),
                          }}
                        >
                          {summarizeRoundResult(row)}
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        <IconButton
                          size="small"
                          aria-label="Eliminar ronda"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRound(row.roundNum);
                          }}
                          disabled={saveRounds.isPending}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          </>
        )}

        {showRoundFormToggle ? (
          <Button
            fullWidth
            variant="outlined"
            startIcon={formOpen ? undefined : <AddIcon />}
            onClick={() => {
              setFormOpen((prev) => {
                if (prev) {
                  resetForm();
                  return false;
                }
                if (!canAddRound) return false;
                resetForm();
                return true;
              });
            }}
            sx={(t) => ({
              py: 1.35,
              borderStyle: "dashed",
              borderWidth: 2,
              borderColor: alpha(t.palette.primary.main, 0.5),
              bgcolor: alpha(t.palette.primary.main, 0.07),
              color: "primary.main",
              fontWeight: 700,
              "&:hover": {
                borderColor: t.palette.primary.main,
                bgcolor: alpha(t.palette.primary.main, 0.14),
              },
            })}
          >
            {formOpen ? "Cerrar formulario" : "Añadir ronda"}
          </Button>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ py: 1.5, textAlign: "center", fontStyle: "italic" }}
          >
            {maxSelfReportedRounds === 0
              ? "Tu récord oficial es 0-0-0: no hay rondas para registrar en la bitácora."
              : "Ya registraste el máximo de rondas permitido según tu récord del torneo (W + L + T)."}
          </Typography>
        )}

        <Collapse in={formOpen}>
          <Box
            sx={{
              mt: 2,
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {isEditing ? "Editar ronda" : "Ronda"} {formRoundLabel}
            </Typography>

            {special === "none" ? (
              <Stack spacing={2}>
                <Typography variant="body2" fontWeight={600}>
                  Deck del rival{" "}
                  <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>
                    (opcional)
                  </Typography>
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Autocomplete
                    fullWidth
                    options={optionsForSlot1}
                    loading={optionsLoading}
                    value={slot1Value}
                    onChange={(_e, v) => setSlot1(v)}
                    filterOptions={(opts, params) => filter(opts, params)}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(a, b) => a.slug === b.slug}
                    renderOption={(props, option) =>
                      renderPokemonOption(props as AutocompleteLiProps, option)
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Pokémon" placeholder="Selecciona Pokémon…" />
                    )}
                  />
                  <Autocomplete
                    fullWidth
                    options={optionsForSlot2}
                    loading={optionsLoading}
                    value={slot2Value}
                    onChange={(_e, v) => setSlot2(v)}
                    filterOptions={(opts, params) => filter(opts, params)}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(a, b) => a.slug === b.slug}
                    renderOption={(props, option) =>
                      renderPokemonOption(props as AutocompleteLiProps, option)
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Pokémon" placeholder="Selecciona Pokémon…" />
                    )}
                  />
                </Stack>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems="flex-start"
                  sx={{ width: "100%" }}
                >
                  {gameRows.map((g, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        flex: 1,
                        minWidth: { xs: "100%", sm: 0 },
                        maxWidth: { sm: 200 },
                      }}
                    >
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        Juego {idx + 1}
                      </Typography>
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Resultado
                        </Typography>
                        <ToggleButtonGroup
                          exclusive
                          size="small"
                          value={g.result}
                          onChange={(_e, v) => {
                            if (v == null) return;
                            patchGame(idx, { result: v });
                          }}
                          sx={{ display: "flex", flexWrap: "wrap" }}
                        >
                          <ToggleButton value="W">W</ToggleButton>
                          <ToggleButton value="L">L</ToggleButton>
                          <ToggleButton value="T">T</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Sale
                        </Typography>
                        <ToggleButtonGroup
                          exclusive
                          size="small"
                          value={g.turn}
                          onChange={(_e, v) => {
                            if (v == null) return;
                            patchGame(idx, { turn: v });
                          }}
                        >
                          <ToggleButton value="first">1º</ToggleButton>
                          <ToggleButton value="second">2º</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                      {idx === 2 && needsTiebreakResult ? (
                        <Typography
                          variant="caption"
                          sx={{ mt: 1, display: "block", color: MATCH_TIE_COLOR }}
                        >
                          Desempate obligatorio
                        </Typography>
                      ) : null}
                    </Box>
                  ))}
                </Stack>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Este desenlace no usa juegos individuales. Se guardará solo la marca especial.
              </Typography>
            )}

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2, mb: 1 }}>
              Otro desenlace
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={special}
              onChange={(_e, v) => v != null && setSpecial(v)}
              sx={{ mb: 2, flexWrap: "wrap", gap: 0.5 }}
            >
              <ToggleButton value="none">Partido normal</ToggleButton>
              <ToggleButton value="intentional_draw">
                <HandshakeOutlinedIcon sx={{ mr: 0.5, fontSize: 18 }} />
                ID
              </ToggleButton>
              <ToggleButton value="no_show">
                <PersonOffOutlinedIcon sx={{ mr: 0.5, fontSize: 18 }} />
                No show
              </ToggleButton>
              <ToggleButton value="bye">
                <WavingHandOutlinedIcon sx={{ mr: 0.5, fontSize: 18 }} />
                Bye
              </ToggleButton>
            </ToggleButtonGroup>

            {saveRounds.isError ? (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {saveRounds.error instanceof Error
                  ? saveRounds.error.message
                  : "Error"}
              </Typography>
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                fullWidth
                disabled={
                  saveRounds.isPending ||
                  optionsLoading ||
                  (special === "none" && !canSaveNormalRound)
                }
                onClick={handleSaveRound}
                sx={(t) => ({
                  py: 1.25,
                  fontWeight: 700,
                  bgcolor: t.palette.grey[900],
                  color: t.palette.common.white,
                  "&:hover": { bgcolor: t.palette.grey[800] },
                })}
              >
                {saveRounds.isPending
                  ? "Guardando…"
                  : isEditing
                    ? "Guardar cambios"
                    : "Añadir ronda"}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  resetForm();
                  setFormOpen(false);
                }}
              >
                Cancelar
              </Button>
            </Stack>
          </Box>
        </Collapse>
      </Box>
    </Card>
  );
}
