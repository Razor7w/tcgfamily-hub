import "server-only";

import connectDB from "@/lib/mongodb";
import {
  mergeDashboardSettings,
  type DashboardModuleSettingsDTO,
} from "@/lib/dashboard-module-config";
import DashboardModuleSettings from "@/models/DashboardModuleSettings";

/** Lectura en servidor para el layout de /dashboard (sin API pública). */
export async function loadDashboardModuleSettings(): Promise<DashboardModuleSettingsDTO> {
  await connectDB();
  const doc = await DashboardModuleSettings.findOne().lean();
  const d = doc as {
    visibility?: DashboardModuleSettingsDTO["visibility"];
    order?: DashboardModuleSettingsDTO["order"];
    shortcuts?: DashboardModuleSettingsDTO["shortcuts"];
  } | null;
  return mergeDashboardSettings(
    d
      ? {
          visibility: d.visibility,
          order: d.order,
          shortcuts: d.shortcuts,
        }
      : null,
  );
}
