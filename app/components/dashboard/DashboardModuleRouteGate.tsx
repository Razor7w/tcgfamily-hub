"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useDashboardModuleSettings } from "@/hooks/useDashboardModules";
import {
  mergeDashboardSettings,
  type DashboardModuleId,
} from "@/lib/dashboard-module-config";

type Props = {
  moduleId: DashboardModuleId;
  children: ReactNode;
};

/**
 * Redirige a /dashboard si el módulo está desactivado en la configuración del panel.
 */
export default function DashboardModuleRouteGate({ moduleId, children }: Props) {
  const router = useRouter();
  const { data, isPending } = useDashboardModuleSettings();
  const merged = data ?? mergeDashboardSettings(null);
  const allowed = merged.visibility[moduleId];

  useEffect(() => {
    if (isPending) return;
    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [allowed, isPending, router]);

  if (isPending) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60dvh",
        }}
      >
        <CircularProgress aria-label="Cargando" />
      </Box>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
