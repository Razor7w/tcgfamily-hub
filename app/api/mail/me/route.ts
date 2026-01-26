import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import Mail from "@/models/Mails";
import mongoose from "mongoose";

// GET - mails donde el usuario actual es emisor (from) o receptor (to)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectDB();
    const userId = session.user.id as string;
    let uid: mongoose.Types.ObjectId;
    try {
      uid = new mongoose.Types.ObjectId(userId);
    } catch {
      return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 });
    }

    const mails = await Mail.find({
      $or: [{ fromUserId: uid }, { toUserId: uid }],
    })
      .sort({ createdAt: -1 })
      .populate("fromUserId", "name rut")
      .populate("toUserId", "name rut")
      .lean();

    return NextResponse.json({ mails }, { status: 200 });
  } catch (error) {
    console.error("Error al obtener mails:", error);
    return NextResponse.json(
      { error: "Error al obtener mails" },
      { status: 500 },
    );
  }
}
