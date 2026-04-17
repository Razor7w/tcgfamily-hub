import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  endOfWeekSunday,
  startOfWeekMonday,
} from "@/components/events/weekUtils";
import type { FullTournamentUploadPayload } from "@/lib/tournament-tdf-payload";
import type { WeeklyEventState } from "@/models/WeeklyEvent";

export type { FullTournamentUploadPayload };

export type { WeeklyEventState };

export interface PublicWeeklyEvent {
  _id: string;
  startsAt: string;
  title: string;
  kind: "tournament" | "trade_day" | "other";
  game: "pokemon" | "magic" | "other_tcg";
  pokemonSubtype: "casual" | "cup" | "challenge" | null;
  priceClp: number;
  maxParticipants: number;
  formatNotes: string;
  prizesNotes: string;
  location: string;
  state: WeeklyEventState;
  /** Ronda actual del torneo (0 = sin iniciar / sin dato). */
  roundNum: number;
  participantNames: string[];
  participantCount: number;
  canPreRegister: boolean;
  myRegistration: string | null;
  /** Confirmado por admin en el panel (asistencia). */
  myAttendanceConfirmed: boolean;
  /** Mesa si estás inscrito; null si no. */
  myTable: string | null;
  /** Nombre del oponente si hay emparejamiento; null si no aplica. */
  myOpponentName: string | null;
  /** Récord W-L-T persistido (TDF); null si no estás inscrito. */
  myMatchRecord: { wins: number; losses: number; ties: number } | null;
  canUnregister: boolean;
  /** Solo si el torneo está cerrado y hay datos importados. */
  standingsTopByCategory?: {
    categoryIndex: number;
    rows: { place: number; displayName: string }[];
  }[];
  /** Posición del usuario (POP) en su categoría; null si no figura. */
  myTournamentPlacement?: {
    categoryIndex: number;
    categoryLabel: string;
    place: number | null;
    isDnf: boolean;
  } | null;
}

export function useWeekEvents(weekAnchor: Date | null) {
  const from = weekAnchor ? startOfWeekMonday(weekAnchor) : null;
  const to = weekAnchor ? endOfWeekSunday(weekAnchor) : null;

  return useQuery<{ events: PublicWeeklyEvent[] }>({
    queryKey: ["weekly-events", from?.toISOString(), to?.toISOString()],
    queryFn: async () => {
      if (!from || !to) {
        return { events: [] };
      }
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const res = await fetch(`/api/events?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Error al cargar eventos");
      }
      return res.json();
    },
    enabled: !!weekAnchor,
  });
}

/** Respuesta de GET /api/events/[id]/current-round (emparejamientos publicados). */
export type EventCurrentRoundResponse = {
  roundNum: number;
  syncedAt: string | null;
  hasSnapshot: boolean;
  pairings: {
    tableNumber: string;
    player1Name: string;
    player2Name: string;
    player1Record: { wins: number; losses: number; ties: number };
    player2Record: { wins: number; losses: number; ties: number };
    isBye: boolean;
  }[];
  skipped: { tableNumber: string; reason: string }[];
};

export function useEventCurrentRound(eventId: string | null, enabled: boolean) {
  return useQuery<EventCurrentRoundResponse>({
    queryKey: ["event-current-round", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/current-round`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Error al cargar la ronda",
        );
      }
      return data as EventCurrentRoundResponse;
    },
    enabled: Boolean(eventId && enabled),
    staleTime: 0,
  });
}

export function useRegisterWeeklyEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      eventId: string;
      displayName: string;
      popId: string;
      table: string;
      opponentId: string;
    }) => {
      const res = await fetch(`/api/events/${input.eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: input.displayName,
          popId: input.popId,
          table: input.table,
          opponentId: input.opponentId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Error al preinscribirse",
        );
      }
      return data as {
        ok: boolean;
        participantNames: string[];
        participantCount: number;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-events"] });
    },
  });
}

export function useUnregisterWeeklyEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Error al desinscribirse",
        );
      }
      return data as {
        ok: boolean;
        participantNames: string[];
        participantCount: number;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-events"] });
    },
  });
}

export type AdminEventParticipant = {
  displayName: string;
  userId: string | null;
  popId: string;
  table: string;
  opponentId: string;
  confirmed: boolean;
  wins: number;
  losses: number;
  ties: number;
  createdAt?: string;
};

export interface AdminWeeklyEvent {
  _id: string;
  startsAt: string;
  title: string;
  kind: "tournament" | "trade_day" | "other";
  game: "pokemon" | "magic" | "other_tcg";
  pokemonSubtype?: string;
  state: WeeklyEventState;
  priceClp: number;
  maxParticipants: number;
  formatNotes: string;
  prizesNotes: string;
  location: string;
  /** Ronda actual del torneo; por defecto 0. */
  roundNum?: number;
  /** Snapshots guardados al pulsar «Setear ronda» (persistidos en Mongo). */
  roundSnapshots?: { roundNum: number; syncedAt?: string }[];
  /** Clasificación final por categoría (0 Júnior, 1 Sénior, 2 Máster). */
  tournamentStandings?: {
    categoryIndex: number;
    finished: { popId: string; place: number }[];
    dnf: { popId: string }[];
  }[];
  participants: AdminEventParticipant[];
  createdAt?: string;
  updatedAt?: string;
}

export function useAdminEvents() {
  return useQuery<{ events: AdminWeeklyEvent[] }>({
    queryKey: ["admin-weekly-events"],
    queryFn: async () => {
      const res = await fetch("/api/admin/events");
      if (!res.ok) {
        throw new Error("Error al cargar eventos");
      }
      return res.json();
    },
  });
}

export function useCreateAdminEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Error al crear",
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-weekly-events"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-events"] });
    },
  });
}

export function useConfirmParticipantParticipation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      eventId: string;
      userId: string;
      confirmed: boolean;
    }) => {
      const res = await fetch(
        `/api/admin/events/${input.eventId}/participants`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: input.userId,
            confirmed: input.confirmed,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Error al confirmar participación",
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-weekly-events"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-events"] });
    },
  });
}

export type AdminPreinscribeBatchResult = {
  ok: boolean;
  added: number;
  skippedDuplicateInFile: number;
  skippedInvalidPop: number;
  skippedAlreadyRegistered: number;
  skippedCapacity: number;
  participantCount: number;
};

export type AdminSyncRoundResult = {
  ok: boolean;
  roundNum: number;
  state: WeeklyEventState;
  appliedMatches: number;
  recordsApplied: number;
  skipped: { tableNumber: string; reason: string }[];
  participantCount: number;
  roundSnapshotsCount: number;
};

/** Aplica mesa + oponente según TDF y fija `roundNum` en el WeeklyEvent. */
/** Importa torneo completo desde TDF (.tdf final): participantes, rondas, standings, estado close. */
export function useAdminUploadFullTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      eventId: string;
      payload: FullTournamentUploadPayload;
    }) => {
      const res = await fetch(
        `/api/admin/events/${input.eventId}/full-tournament`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input.payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Error al subir el torneo",
        );
      }
      return data as {
        ok: boolean;
        roundNum: number;
        state: string;
        participantCount: number;
        roundSnapshotsCount: number;
        tournamentStandingsCategories: number;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-weekly-events"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-events"] });
      queryClient.invalidateQueries({ queryKey: ["event-current-round"] });
    },
  });
}

/** Guarda una sola tabla (finished o DNF) de una categoría de standings. */
export function useAdminUploadStandingsPod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      eventId: string;
      categoryIndex: 0 | 1 | 2;
      podType: "finished" | "dnf";
      rows: { popId: string; place?: number }[];
    }) => {
      const res = await fetch(
        `/api/admin/events/${input.eventId}/standings-pod`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryIndex: input.categoryIndex,
            podType: input.podType,
            rows: input.rows,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Error al guardar la tabla",
        );
      }
      return data as { ok: boolean; categoryIndex: number; podType: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-weekly-events"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-events"] });
    },
  });
}

export function useAdminSyncEventRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      eventId: string;
      roundNum: number;
      matches: {
        tableNumber: string;
        player1PopId: string;
        player2PopId: string;
      }[];
      participantRecords: {
        popId: string;
        wins: number;
        losses: number;
        ties: number;
      }[];
      roundSnapshot: {
        pairings: {
          tableNumber: string;
          player1PopId: string;
          player2PopId: string;
          player1Name: string;
          player2Name: string;
          player1Record: { wins: number; losses: number; ties: number };
          player2Record: { wins: number; losses: number; ties: number };
          isBye: boolean;
        }[];
      };
    }) => {
      const res = await fetch(
        `/api/admin/events/${input.eventId}/sync-round`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roundNum: input.roundNum,
            matches: input.matches,
            participantRecords: input.participantRecords,
            roundSnapshot: input.roundSnapshot,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Error al setear la ronda",
        );
      }
      return data as AdminSyncRoundResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-weekly-events"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-events"] });
      queryClient.invalidateQueries({ queryKey: ["event-current-round"] });
    },
  });
}

export function useAdminPreinscribeBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      eventId: string;
      players: { displayName: string; popId: string }[];
    }) => {
      const res = await fetch(
        `/api/admin/events/${input.eventId}/participants/batch`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ players: input.players }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Error al preinscribir en lote",
        );
      }
      return data as AdminPreinscribeBatchResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-weekly-events"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-events"] });
    },
  });
}

export function useUpdateAdminEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      body: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/admin/events/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Error al guardar",
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-weekly-events"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-events"] });
    },
  });
}

export function useDeleteAdminEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Error al eliminar",
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-weekly-events"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-events"] });
    },
  });
}
