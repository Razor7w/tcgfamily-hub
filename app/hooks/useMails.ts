import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
