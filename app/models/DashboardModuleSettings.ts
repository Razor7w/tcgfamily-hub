import mongoose, { Schema, type Document } from "mongoose";
import type { DashboardModuleId } from "@/lib/dashboard-module-config";
import { DEFAULT_DASHBOARD_ORDER } from "@/lib/dashboard-module-config";

export interface IDashboardModuleSettings extends Document {
  visibility: {
    weeklyEvents: boolean;
    mail: boolean;
    storePoints: boolean;
  };
  order: DashboardModuleId[];
}

const DashboardModuleSettingsSchema = new Schema<IDashboardModuleSettings>(
  {
    visibility: {
      weeklyEvents: { type: Boolean, default: true },
      mail: { type: Boolean, default: true },
      storePoints: { type: Boolean, default: true },
    },
    order: {
      type: [String],
      default: () => [...DEFAULT_DASHBOARD_ORDER],
    },
  },
  { timestamps: true },
);

export default mongoose.models.DashboardModuleSettings ||
  mongoose.model<IDashboardModuleSettings>(
    "DashboardModuleSettings",
    DashboardModuleSettingsSchema,
  );
