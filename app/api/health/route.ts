// app/api/health/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";

export async function GET() {
  try {
    await connectDB();

    const connectionState = mongoose.connection.readyState;
    const states = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    const isConnected = connectionState === 1;

    return NextResponse.json(
      {
        status: isConnected ? "healthy" : "unhealthy",
        database: {
          state: states[connectionState as keyof typeof states],
          name: mongoose.connection.db?.databaseName || "unknown",
          host: mongoose.connection.host || "unknown",
          port: mongoose.connection.port || "unknown",
        },
        timestamp: new Date().toISOString(),
      },
      {
        status: isConnected ? 200 : 503,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
      },
    );
  }
}
