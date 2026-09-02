import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkPermission, createAuditLog, getClientIp } from '@/lib/auth-helpers'

// GET /api/encounters — list with filters
export async function GET(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'dokter', 'perawat_bidan', 'resepsionis_admin', 'apoteker',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const doctorId = searchParams.get('doctorId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      clinicId: perm.clinicId,
      deletedAt: null,
    }

    if (patientId) where.patientId = patientId
    if (doctorId) where.doctorId = doctorId
    if (status) where.status = status
    if (date) {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      where.encounterDate = { gte: start, lte: end }
    }

    const [encounters, total] = await Promise.all([
      db.encounter.findMany({
        where,
        select: {
          id: true, encounterDate: true, encounterType: true, status: true,
          chiefComplaint: true, notes: true, createdAt: true,
          patient: { select: { id: true, rmNumber: true, fullName: true, gender: true, birthDate: true } },
          doctor: { select: { id: true, fullName: true, specialty: true } },
        },
        orderBy: { encounterDate: 'desc' },
        skip,
        take: limit,
      }),
      db.encounter.count({ where }),
    ])

    return NextResponse.json({
      data: encounters,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[GET /api/encounters]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/encounters — create encounter
export async function POST(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'dokter', 'perawat_bidan', 'resepsionis_admin',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { patientId, doctorId, encounterType, chiefComplaint, notes } = body

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID wajib diisi' }, { status: 400 })
    }
    if (!doctorId) {
      return NextResponse.json({ error: 'Dokter ID wajib diisi' }, { status: 400 })
    }

    const encounter = await db.encounter.create({
      data: {
        clinicId: perm.clinicId,
        patientId,
        doctorId,
        encounterDate: new Date(),
        encounterType: encounterType || 'rawat_jalan',
        status: 'berlangsung',
        chiefComplaint: chiefComplaint || '',
        notes: notes || '',
        createdBy: perm.userId,
      },
      include: {
        patient: { select: { id: true, rmNumber: true, fullName: true } },
        doctor: { select: { id: true, fullName: true, specialty: true } },
      },
    })

    await createAuditLog({
      clinicId: perm.clinicId,
      userId: perm.userId,
      userName: perm.userName,
      action: 'CREATE',
      tableName: 'Encounter',
      recordId: encounter.id,
      newData: JSON.stringify(encounter),
      ipAddress: getClientIp(request),
    })

    return NextResponse.json({ data: encounter }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/encounters]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
