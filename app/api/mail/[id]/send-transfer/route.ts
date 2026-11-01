import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import Mails from '@/models/Mails'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import { MAIL_BRANCH_TRANSFER_FEE_CLP } from '@/lib/mail-store-transfer'
import { otherBranchAcceptError } from '@/lib/mail-staff-branch-server'
import { listActiveBranchesForStore } from '@/lib/store-branch'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Deja el correo en tránsito hacia otra sucursal.
 * Sirve para un segundo envío (por ejemplo devolverlo) después de que ya fue recepcionado.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    const { id } = await context.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'ID de mail inválido' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => null)
    const destinationRaw =
      body && typeof body.destinationBranchId === 'string'
        ? body.destinationBranchId.trim()
        : ''
    if (!mongoose.Types.ObjectId.isValid(destinationRaw)) {
      return NextResponse.json(
        { error: 'Elige la sucursal de destino' },
        { status: 400 }
      )
    }

    await connectDB()
    const scoped = mongoFilterByStore(
      gate.activeStoreOid,
      gate.primaryStoreOid ?? null
    ) as Record<string, unknown>
    const mail = await Mails.findOne({
      _id: new mongoose.Types.ObjectId(id),
      ...scoped
    })
    if (!mail) {
      return NextResponse.json({ error: 'Mail no encontrado' }, { status: 404 })
    }

    if (mail.isRecived) {
      return NextResponse.json(
        { error: 'No puedes enviar un correo que ya fue retirado' },
        { status: 409 }
      )
    }

    const transfer = mail.transfer as { status?: string } | undefined
    if (transfer?.status === 'in_transit') {
      return NextResponse.json(
        {
          error:
            'Este correo ya está en tránsito. La sucursal de destino debe recepcionarlo antes de enviarlo de nuevo.'
        },
        { status: 409 }
      )
    }

    const currentBranchId = mail.branchId ? String(mail.branchId) : ''
    if (!mongoose.Types.ObjectId.isValid(currentBranchId)) {
      return NextResponse.json(
        { error: 'Asigna una sucursal antes de enviarlo' },
        { status: 400 }
      )
    }
    if (currentBranchId === destinationRaw) {
      return NextResponse.json(
        { error: 'La sucursal de destino debe ser distinta a la actual' },
        { status: 400 }
      )
    }

    const otherBranch = await otherBranchAcceptError({
      email: gate.session.user.email,
      branchIds: [currentBranchId]
    })
    if (otherBranch) {
      return NextResponse.json({ error: otherBranch }, { status: 403 })
    }

    const storeOid =
      (mail.storeId as mongoose.Types.ObjectId | undefined) ??
      gate.activeStoreOid
    const branches = await listActiveBranchesForStore(storeOid)
    const origin = branches.find(b => b.id === currentBranchId)
    const destination = branches.find(b => b.id === destinationRaw)
    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'La sucursal de destino no pertenece a esta tienda' },
        { status: 400 }
      )
    }

    mail.set('transfer', {
      status: 'in_transit',
      feeClp: MAIL_BRANCH_TRANSFER_FEE_CLP,
      originBranchId: new mongoose.Types.ObjectId(origin.id),
      originBranchName: origin.name.trim(),
      destinationBranchId: new mongoose.Types.ObjectId(destination.id),
      destinationBranchName: destination.name.trim()
    })
    mail.markModified('transfer')
    await mail.save()

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('POST /api/mail/[id]/send-transfer:', error)
    return NextResponse.json(
      { error: 'No se pudo enviar el correo a la otra sucursal' },
      { status: 500 }
    )
  }
}
