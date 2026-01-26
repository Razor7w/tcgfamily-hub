import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import Mail from "@/models/Mails";
import User from "@/models/User";

// GET - listar mails
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await connectDB();

    const mails = await Mail.find({})
      .sort({ createdAt: -1 })
      .populate("fromUserId", "name rut")
      .populate("toUserId", "name rut")
      .lean();

    return NextResponse.json({ mails }, { status: 200 });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 },
    );
  }
}

// POST - crear mail
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await connectDB();

    const body = await request.json();
    const { fromUserId, toUserId, isRecived, observations } = body;

    // Validar que se envíen los IDs requeridos
    if (!fromUserId || !toUserId) {
      return NextResponse.json(
        { error: "fromUserId y toUserId son requeridos" },
        { status: 400 },
      );
    }

    // Validar que fromUserId y toUserId sean diferentes
    if (fromUserId === toUserId) {
      return NextResponse.json(
        { error: "fromUserId y toUserId no pueden ser el mismo" },
        { status: 400 },
      );
    }

    // Validar existencia de fromUserId
    const fromUser = await User.findById(fromUserId);
    if (!fromUser) {
      return NextResponse.json(
        { error: `El usuario con ID ${fromUserId} no existe` },
        { status: 404 },
      );
    }

    // Validar existencia de toUserId
    const toUser = await User.findById(toUserId);
    if (!toUser) {
      return NextResponse.json(
        { error: `El usuario con ID ${toUserId} no existe` },
        { status: 404 },
      );
    }

    // Crear el mail
    const newMail = new Mail({
      fromUserId,
      toUserId,
      isRecived: isRecived ?? false,
      observations: observations ?? "",
    });

    const savedMail = await newMail.save();

    // Retornar el mail con los datos poblados
    const populatedMail = await Mail.findById(savedMail._id)
      .populate("fromUserId", "name rut")
      .populate("toUserId", "name rut")
      .lean();

    return NextResponse.json({ mail: populatedMail }, { status: 201 });
  } catch (error) {
    console.error("Error al crear mail:", error);
    return NextResponse.json(
      { error: "Error al crear mail" },
      { status: 500 },
    );
  }
}
