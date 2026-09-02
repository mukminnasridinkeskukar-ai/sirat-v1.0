import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkPermission, createAuditLog, getClientIp } from '@/lib/auth-helpers'

// GET /api/encounters/[id] — detail with all relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'dokter', 'perawat_bidan', 'resepsionis_admin', 'apoteker',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const encounter = await db.encounter.findFirst({
      where: { id, clinicId: perm.clinicId, deletedAt: null },
      include: {
        patient: { select: { id: true, rmNumber: true, fullName: true, gender: true, birthDate: true, bloodType: true, allergies: true } },
        doctor: { select: { id: true, fullName: true, specialty: true, sip: true } },
        vitalSigns: { where: { deletedAt: null } },
        soapNotes: { where: { deletedAt: null } },
        diagnoses: { where: { deletedAt: null } },
        procedures: { where: { deletedAt: null } },
        prescriptions: {
          where: { deletedAt: null },
          include: { prescriptionItems: { where: { deletedAt: null } } },
        },
        labResults: { where: { deletedAt: null } },
        consentForms: { where: { deletedAt: null } },
      },
    })

    if (!encounter) {
      return NextResponse.json({ error: 'Kunjungan tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ data: encounter })
  } catch (error) {
    console.error('[GET /api/encounters/[id]]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT /api/encounters/[id] — update encounter status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'dokter',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await db.encounter.findFirst({
      where: { id, clinicId: perm.clinicId, deletedAt: null },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Kunjungan tidak ditemukan' }, { status: 404 })
    }

    const validStatuses = ['berlangsung', 'selesai', 'dibatalkan']
    const newStatus = body.status
    if (newStatus && !validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Status harus salah satu dari: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (newStatus) updateData.status = newStatus
    if (body.chiefComplaint !== undefined) updateData.chiefComplaint = body.chiefComplaint
    if (body.notes !== undefined) updateData.notes = body.notes

    const oldData = JSON.stringify(existing)
    const updated = await db.encounter.update({ where: { id }, data: updateData })

    await createAuditLog({
      clinicId: perm.clinicId,
      userId: perm.userId,
      userName: perm.userName,
      action: 'UPDATE',
      tableName: 'Encounter',
      recordId: id,
      oldData,
      newData: JSON.stringify(updated),
      ipAddress: getClientIp(request),
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[PUT /api/encounters/[id]]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
