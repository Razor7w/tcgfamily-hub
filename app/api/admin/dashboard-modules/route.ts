import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import {
  mergeDashboardSettings,
  normalizeDashboardOrder,
  type DashboardModuleSettingsDTO,
} from "@/lib/dashboard-module-config";
import DashboardModuleSettings from "@/models/DashboardModuleSettings";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
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
    console.error("GET /api/admin/dashboard-modules:", e);
    return NextResponse.json(
      { error: "Error al cargar configuración" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const vis = body?.visibility;
    const orderRaw = body?.order;

    if (!vis || typeof vis !== "object") {
      return NextResponse.json(
        { error: "Se requiere visibility con weeklyEvents, mail y storePoints" },
        { status: 400 },
      );
    }
    if (
      typeof vis.weeklyEvents !== "boolean" ||
      typeof vis.mail !== "boolean" ||
      typeof vis.storePoints !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Cada clave de visibility debe ser boolean" },
        { status: 400 },
      );
    }

    const normalizedOrder = normalizeDashboardOrder(orderRaw);
    if (!normalizedOrder) {
      return NextResponse.json(
        {
          error:
            "order debe ser una permutación de weeklyEvents, mail, storePoints",
        },
        { status: 400 },
      );
    }

    await connectDB();

    let doc = await DashboardModuleSettings.findOne();
    if (!doc) {
      doc = await DashboardModuleSettings.create({
        visibility: {
          weeklyEvents: vis.weeklyEvents,
          mail: vis.mail,
          storePoints: vis.storePoints,
        },
        order: normalizedOrder,
      });
    } else {
      doc.visibility = {
        weeklyEvents: vis.weeklyEvents,
        mail: vis.mail,
        storePoints: vis.storePoints,
      };
      doc.order = normalizedOrder;
      await doc.save();
    }

    const settings = mergeDashboardSettings({
      visibility: doc.visibility,
      order: doc.order as DashboardModuleSettingsDTO["order"],
    });

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/eventos");
    revalidatePath("/dashboard/mail");

    return NextResponse.json({ settings }, { status: 200 });
  } catch (e) {
    console.error("PUT /api/admin/dashboard-modules:", e);
    return NextResponse.json(
      { error: "Error al guardar configuración" },
      { status: 500 },
    );
  }
}
