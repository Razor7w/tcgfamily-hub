import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  endOfWeekSunday,
  startOfWeekMonday,
} from "@/components/events/weekUtils";

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
  participantNames: string[];
  participantCount: number;
  canPreRegister: boolean;
  myRegistration: string | null;
  canUnregister: boolean;
}

export function useWeekEvents(weekAnchor: Date | null) {
  const from = weekAnchor ? startOfWeekMonday(weekAnchor) : null;
  const to = weekAnchor ? endOfWeekSunday(weekAnchor) : null;

  return useQuery<{ events: PublicWeeklyEvent[] }>({
    queryKey: ["weekly-events", from?.toISOString(), to?.toISOString()],
    refetchInterval: 45_000,
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

export function useRegisterWeeklyEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { eventId: string; displayName: string }) => {
      const res = await fetch(`/api/events/${input.eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: input.displayName }),
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

export interface AdminWeeklyEvent {
  _id: string;
  startsAt: string;
  title: string;
  kind: "tournament" | "trade_day" | "other";
  game: "pokemon" | "magic" | "other_tcg";
  pokemonSubtype?: string;
  priceClp: number;
  maxParticipants: number;
  formatNotes: string;
  prizesNotes: string;
  location: string;
  participants: { displayName: string; createdAt?: string }[];
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
