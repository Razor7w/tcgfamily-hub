import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hooks para la API de mails (TanStack Query).
 * Ver ejemplos completos en ./MAILS_USAGE.md
 */

export interface Mail {
  _id: string;
  fromUserId: {
    _id: string;
    name?: string;
    rut?: string;
  };
  toUserId: {
    _id: string;
    name?: string;
    rut?: string;
  };
  isRecived: boolean;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMailData {
  fromUserId: string;
  toUserId: string;
  isRecived?: boolean;
  observations?: string;
}

/** Datos para actualizar un mail (todos opcionales). */
export interface UpdateMailData {
  fromUserId?: string;
  toUserId?: string;
  isRecived?: boolean;
  observations?: string;
}

// Hook para obtener todos los mails
export function useMails() {
  return useQuery<{ mails: Mail[] }>({
    queryKey: ["mails"],
    queryFn: async () => {
      const response = await fetch("/api/mail");
      if (!response.ok) {
        throw new Error("Error al cargar mails");
      }
      return response.json();
    },
  });
}

// Hook para crear un mail
export function useCreateMail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMailData) => {
      const response = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear mail");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidar y refetch la lista de mails
      queryClient.invalidateQueries({ queryKey: ["mails"] });
    },
  });
}

// Hook para obtener un mail por ID
export function useGetMailById(mailId: string | null) {
  return useQuery<Mail>({
    queryKey: ["mails", mailId],
    queryFn: async () => {
      const response = await fetch(`/api/mail/${mailId}`);
      if (!response.ok) {
        throw new Error("Error al cargar mail");
      }
      const data = await response.json();
      return data.mail as Mail;
    },
    enabled: !!mailId?.trim(),
  });
}

// Hook para actualizar un mail por ID
export function useUpdateMail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mailId,
      data,
    }: {
      mailId: string;
      data: UpdateMailData;
    }) => {
      const response = await fetch(`/api/mail/${mailId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar mail");
      }

      const res = await response.json();
      return res.mail as Mail;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["mails"] });
      queryClient.invalidateQueries({ queryKey: ["mails", variables.mailId] });
    },
  });
}

// Hook para eliminar un mail por ID
export function useDeleteMail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mailId: string) => {
      const response = await fetch(`/api/mail/${mailId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al eliminar mail");
      }

      return response.json();
    },
    onSuccess: (_, mailId) => {
      queryClient.invalidateQueries({ queryKey: ["mails"] });
      queryClient.removeQueries({ queryKey: ["mails", mailId] });
    },
  });
}
