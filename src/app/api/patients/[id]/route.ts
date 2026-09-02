import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkPermission, createAuditLog, getClientIp } from '@/lib/auth-helpers'
import { createHash } from 'crypto'

// GET /api/patients/[id] — detail with last 10 encounters
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

    const patient = await db.patient.findFirst({
      where: { id, clinicId: perm.clinicId, deletedAt: null },
      include: {
        encounters: {
          where: { deletedAt: null },
          select: {
            id: true, encounterDate: true, encounterType: true, status: true,
            chiefComplaint: true,
            doctor: { select: { id: true, fullName: true, specialty: true } },
          },
          orderBy: { encounterDate: 'desc' },
          take: 10,
        },
      },
    })

    if (!patient) {
      return NextResponse.json({ error: 'Pasien tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ data: patient })
  } catch (error) {
    console.error('[GET /api/patients/[id]]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT /api/patients/[id] — update patient
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'resepsionis_admin',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await db.patient.findFirst({
      where: { id, clinicId: perm.clinicId, deletedAt: null },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Pasien tidak ditemukan' }, { status: 404 })
    }

    // If NIK is being changed, validate it
    if (body.nik && body.nik !== existing.nik) {
      if (!/^\d{16}$/.test(body.nik)) {
        return NextResponse.json({ error: 'NIK harus berupa 16 digit angka' }, { status: 400 })
      }
      const nikTaken = await db.patient.findFirst({
        where: { nik: body.nik, deletedAt: null, id: { not: id } },
      })
      if (nikTaken) {
        return NextResponse.json({ error: 'NIK sudah terdaftar' }, { status: 409 })
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    const allowedFields = ['fullName', 'birthPlace', 'birthDate', 'gender', 'address', 'phone',
      'allergies', 'medicalHistory', 'emergencyContact', 'emergencyPhone', 'bloodType', 'nik']

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'nik' && body[field] !== existing.nik) {
          updateData[field] = body[field]
          updateData['nikHash'] = createHash('sha256').update(body[field]).digest('hex')
        } else if (field !== 'nik') {
          updateData[field] = body[field]
        }
      }
    }

    const oldData = JSON.stringify(existing)
    const updated = await db.patient.update({ where: { id }, data: updateData })

    await createAuditLog({
      clinicId: perm.clinicId,
      userId: perm.userId,
      userName: perm.userName,
      action: 'UPDATE',
      tableName: 'Patient',
      recordId: id,
      oldData,
      newData: JSON.stringify(updated),
      ipAddress: getClientIp(request),
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[PUT /api/patients/[id]]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
