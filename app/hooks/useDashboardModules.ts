import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DashboardModuleSettingsDTO } from "@/lib/dashboard-module-config";

export type AdminConfiguracionData = {
  settings: DashboardModuleSettingsDTO;
  resendNotifyPickupInStoreEnabled: boolean;
};

/** Configuración admin: bloques del dashboard + correo Resend (requiere rol admin). */
export function useAdminConfiguracion() {
  return useQuery<AdminConfiguracionData>({
    queryKey: ["admin", "configuracion"],
    queryFn: async () => {
      const response = await fetch("/api/admin/configuracion");
      if (!response.ok) {
        throw new Error("Error al cargar configuración");
      }
      const data = (await response.json()) as {
        settings?: DashboardModuleSettingsDTO;
        resendNotifyPickupInStoreEnabled?: boolean;
      };
      if (!data.settings) {
        throw new Error("Respuesta inválida");
      }
      return {
        settings: data.settings,
        resendNotifyPickupInStoreEnabled: data.resendNotifyPickupInStoreEnabled !== false,
      };
    },
    staleTime: 60_000,
  });
}

export function useUpdateDashboardModuleSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: DashboardModuleSettingsDTO) => {
      const response = await fetch("/api/admin/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          typeof err.error === "string" ? err.error : "Error al guardar",
        );
      }
      const data = await response.json();
      return data.settings as DashboardModuleSettingsDTO;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "configuracion"] });
    },
  });
}

export function useUpdateResendPickupNotifySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resendNotifyPickupInStoreEnabled: boolean) => {
      const response = await fetch("/api/admin/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resendNotifyPickupInStoreEnabled }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          typeof err.error === "string" ? err.error : "Error al guardar",
        );
      }
      return response.json() as Promise<AdminConfiguracionData>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "configuracion"] });
    },
  });
}
