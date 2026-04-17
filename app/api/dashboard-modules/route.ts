import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import {
  mergeDashboardSettings,
  type DashboardModuleSettingsDTO,
} from "@/lib/dashboard-module-config";
import DashboardModuleSettings from "@/models/DashboardModuleSettings";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectDB();
    const doc = await DashboardModuleSettings.findOne().lean();
    const d = doc as {
      visibility?: DashboardModuleSettingsDTO["visibility"];
      order?: DashboardModuleSettingsDTO["order"];
    } | null;
    const raw: Partial<DashboardModuleSettingsDTO> | null = d
      ? {
          visibility: d.visibility,
          order: d.order,
        }
      : null;

    const settings = mergeDashboardSettings(raw);
    return NextResponse.json({ settings }, { status: 200 });
  } catch (e) {
    console.error("GET /api/dashboard-modules:", e);
    return NextResponse.json(
      { error: "Error al cargar configuración del panel" },
      { status: 500 },
    );
  }
}
