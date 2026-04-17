"use client";

import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { FolderOpen, GroupAdd } from "@mui/icons-material";
import {
  buildPlayerNameLookup,
  parseTournamentXml,
  type ParsedMatch,
} from "@/lib/tournament-xml";
import { popidForStorage, validatePopidOptional } from "@/lib/rut-chile";
import { useAdminPreinscribeBatch } from "@/hooks/useWeeklyEvents";

function groupMatchesByRound(matches: ParsedMatch[]): Map<number, ParsedMatch[]> {
  const map = new Map<number, ParsedMatch[]>();
  for (const m of matches) {
    const list = map.get(m.roundNumber) ?? [];
    list.push(m);
    map.set(m.roundNumber, list);
  }
  return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
}

type TournamentTdfLoaderProps = {
  /** Si es false, no muestra el párrafo introductorio (p. ej. la página Torneo XML ya lo tiene arriba). */
  showIntro?: boolean;
  /** Evento semanal: muestra botón de preinscripción en lote al listado. */
  eventId?: string;
  /** POP ID ya presentes en el evento (normalizados con `popidForStorage`), para no duplicar. */
  registeredPopIds?: string[];
};

export default function TournamentTdfLoader({
  showIntro = true,
  eventId,
  registeredPopIds = [],
}: TournamentTdfLoaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState("");
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [fileReadError, setFileReadError] = useState<string | null>(null);

  const parsed = useMemo(() => parseTournamentXml(raw), [raw]);
  const names = useMemo(() => buildPlayerNameLookup(parsed.players), [parsed.players]);
  const rounds = useMemo(() => groupMatchesByRound(parsed.matches), [parsed.matches]);

  const preinscribeBatch = useAdminPreinscribeBatch();
  const registeredSet = useMemo(
    () => new Set(registeredPopIds.map((id) => popidForStorage(id)).filter(Boolean)),
    [registeredPopIds],
  );

  const showEventActions = Boolean(eventId);

  const batchPlayers = useMemo(() => {
    const seen = new Set<string>();
    const out: { displayName: string; popId: string }[] = [];
    for (const p of parsed.players) {
      const popNorm = popidForStorage(p.popId);
      if (!popNorm) continue;
      if (validatePopidOptional(popNorm)) continue;
      if (seen.has(popNorm)) continue;
      seen.add(popNorm);
      if (registeredSet.has(popNorm)) continue;
      const displayName =
        [p.firstName, p.lastName].filter(Boolean).join(" ").trim() ||
        `Jugador ${popNorm}`;
      out.push({ displayName, popId: p.popId });
    }
    return out;
  }, [parsed.players, registeredSet]);

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileReadError(null);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setRaw(text);
      setLoadedFileName(file.name);
      e.target.value = "";
    };
    reader.onerror = () => {
      setFileReadError("No se pudo leer el archivo.");
      setLoadedFileName(null);
      e.target.value = "";
    };
    reader.readAsText(file, "UTF-8");
  };

  return (
    <Stack spacing={2}>
      {showIntro ? (
        <Typography variant="body2" color="text.secondary">
          Carga un archivo <strong>.tdf</strong> o pega el XML para ver jugadores (POP userid) y
          emparejamientos por ronda.
        </Typography>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".tdf,.xml,application/xml,text/xml"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Button
          variant="contained"
          startIcon={<FolderOpen />}
          onClick={handlePickFile}
          sx={{ alignSelf: { sm: "flex-start" } }}
        >
          Cargar archivo .tdf
        </Button>
        {loadedFileName ? (
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
            Archivo: <strong>{loadedFileName}</strong>
          </Typography>
        ) : null}
      </Stack>

      {fileReadError ? (
        <Alert severity="error">{fileReadError}</Alert>
      ) : null}

      <TextField
        fullWidth
        multiline
        minRows={10}
        maxRows={20}
        label="Contenido (XML / .tdf)"
        placeholder='<?xml version="1.0" ...><tournament ...>'
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          setLoadedFileName(null);
        }}
        size="small"
        sx={{ "& textarea": { fontFamily: "monospace", fontSize: 12 } }}
      />

      {raw.trim() && parsed.error && (
        <Alert severity="error">{parsed.error}</Alert>
      )}

      {parsed.meta && (parsed.meta.name || parsed.meta.startDate) && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Datos del torneo
          </Typography>
          <Stack spacing={0.5}>
            {parsed.meta.name ? (
              <Typography variant="body2">
                <strong>Nombre:</strong> {parsed.meta.name}
              </Typography>
            ) : null}
            {parsed.meta.startDate ? (
              <Typography variant="body2">
                <strong>Fecha inicio:</strong> {parsed.meta.startDate}
              </Typography>
            ) : null}
            {parsed.meta.city || parsed.meta.country ? (
              <Typography variant="body2">
                <strong>Lugar:</strong>{" "}
                {[parsed.meta.city, parsed.meta.state, parsed.meta.country].filter(Boolean).join(", ")}
              </Typography>
            ) : null}
            {parsed.meta.organizerName || parsed.meta.organizerPopId ? (
              <Typography variant="body2">
                <strong>Organizador:</strong> {parsed.meta.organizerName || "—"}{" "}
                {parsed.meta.organizerPopId ? `(POP ${parsed.meta.organizerPopId})` : ""}
              </Typography>
            ) : null}
            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ pt: 0.5 }}>
              {parsed.meta.gameType ? (
                <Chip size="small" label={parsed.meta.gameType} variant="outlined" />
              ) : null}
              {parsed.meta.mode ? (
                <Chip size="small" label={parsed.meta.mode} variant="outlined" />
              ) : null}
              {parsed.meta.version ? (
                <Chip size="small" label={`v${parsed.meta.version}`} variant="outlined" />
              ) : null}
            </Stack>
          </Stack>
        </Paper>
      )}

      {parsed.players.length > 0 && (
        <>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Jugadores ({parsed.players.length})
            </Typography>
            {showEventActions ? (
              <Button
                variant="contained"
                size="medium"
                startIcon={<GroupAdd />}
                disabled={
                  !eventId ||
                  batchPlayers.length === 0 ||
                  preinscribeBatch.isPending
                }
                onClick={async () => {
                  if (!eventId || batchPlayers.length === 0) return;
                  try {
                    await preinscribeBatch.mutateAsync({
                      eventId,
                      players: batchPlayers,
                    });
                  } catch {
                    /* error en estado */
                  }
                }}
                sx={{ fontWeight: 700, alignSelf: { xs: "stretch", sm: "flex-start" } }}
              >
                Preinscribir todos
                {batchPlayers.length > 0 ? ` (${batchPlayers.length})` : ""}
              </Button>
            ) : null}
          </Stack>
          {showEventActions && preinscribeBatch.isError ? (
            <Alert severity="error">
              {preinscribeBatch.error instanceof Error
                ? preinscribeBatch.error.message
                : "Error al preinscribir"}
            </Alert>
          ) : null}
          {showEventActions && preinscribeBatch.isSuccess && preinscribeBatch.data ? (
            <Alert
              severity="success"
              onClose={() => preinscribeBatch.reset()}
            >
              Añadidos al listado: <strong>{preinscribeBatch.data.added}</strong>.
              {preinscribeBatch.data.skippedAlreadyRegistered > 0
                ? ` Omitidos (ya en el evento o usuario duplicado): ${preinscribeBatch.data.skippedAlreadyRegistered}.`
                : ""}
              {preinscribeBatch.data.skippedDuplicateInFile > 0
                ? ` Duplicados en el archivo: ${preinscribeBatch.data.skippedDuplicateInFile}.`
                : ""}
              {preinscribeBatch.data.skippedInvalidPop > 0
                ? ` POP inválidos: ${preinscribeBatch.data.skippedInvalidPop}.`
                : ""}
              {preinscribeBatch.data.skippedCapacity > 0
                ? ` Sin cupo: ${preinscribeBatch.data.skippedCapacity}.`
                : ""}
            </Alert>
          ) : null}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>POP ID</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Nacimiento</TableCell>
                  <TableCell align="center">Starter</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parsed.players.map((p) => (
                  <TableRow key={p.popId}>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: 13 }}>{p.popId}</TableCell>
                    <TableCell>
                      {[p.firstName, p.lastName].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>{p.birthdate || "—"}</TableCell>
                    <TableCell align="center">{p.starter ? "Sí" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {parsed.matches.length > 0 && (
        <>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Emparejamientos ({parsed.matches.length} partidas)
          </Typography>
          <Stack spacing={2}>
            {[...rounds.entries()].map(([roundNum, list]) => (
              <Paper key={roundNum} variant="outlined" sx={{ p: 0, borderRadius: 2, overflow: "hidden" }}>
                <Box sx={{ px: 2, py: 1, bgcolor: "action.hover" }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Ronda {roundNum}
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                        <TableRow>
                          <TableCell width={72}>Mesa</TableCell>
                          <TableCell>Jugador 1</TableCell>
                          <TableCell>Jugador 2</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                      {list.map((m, idx) => (
                        <TableRow key={`${roundNum}-${idx}-${m.tableNumber}`}>
                          <TableCell>{m.tableNumber || "—"}</TableCell>
                          <TableCell>
                            <Typography variant="body2" component="span">
                              {names.get(m.player1UserId) ?? m.player1UserId}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              sx={{ fontFamily: "monospace" }}
                            >
                              {m.player1UserId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" component="span">
                              {names.get(m.player2UserId) ?? m.player2UserId}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              sx={{ fontFamily: "monospace" }}
                            >
                              {m.player2UserId}
                            </Typography>
                          </TableCell>
                          </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ))}
          </Stack>
        </>
      )}

      {raw.trim() && !parsed.error && parsed.players.length === 0 && parsed.matches.length === 0 && (
        <Alert severity="info">
          No se encontraron jugadores ni partidas en el XML. Revisa que incluya{" "}
          <code>&lt;players&gt;</code> y <code>&lt;rounds&gt;</code>.
        </Alert>
      )}
    </Stack>
  );
}
