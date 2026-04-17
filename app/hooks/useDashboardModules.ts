import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DashboardModuleSettingsDTO } from "@/lib/dashboard-module-config";

/** Solo para /admin/dashboard-modules (requiere rol admin). */
export function useAdminDashboardModuleSettings() {
  return useQuery<DashboardModuleSettingsDTO>({
    queryKey: ["admin", "dashboard-modules"],
    queryFn: async () => {
      const response = await fetch("/api/admin/dashboard-modules");
      if (!response.ok) {
        throw new Error("Error al cargar módulos del panel");
      }
      const data = await response.json();
      return data.settings as DashboardModuleSettingsDTO;
    },
    staleTime: 60_000,
  });
}

export function useUpdateDashboardModuleSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: DashboardModuleSettingsDTO) => {
      const response = await fetch("/api/admin/dashboard-modules", {
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
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-modules"] });
    },
  });
}
