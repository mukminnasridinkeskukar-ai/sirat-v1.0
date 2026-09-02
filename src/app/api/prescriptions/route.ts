import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkPermission, createAuditLog, getClientIp } from '@/lib/auth-helpers'

// GET /api/prescriptions — list with filters
export async function GET(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'dokter', 'apoteker', 'resepsionis_admin',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const encounterId = searchParams.get('encounterId')
    const date = searchParams.get('date')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      clinicId: perm.clinicId,
      deletedAt: null,
    }

    if (encounterId) where.encounterId = encounterId
    if (date) {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      where.prescriptionDate = { gte: start, lte: end }
    }

    const [prescriptions, total] = await Promise.all([
      db.prescription.findMany({
        where,
        include: {
          encounter: {
            select: {
              id: true, encounterDate: true,
              patient: { select: { id: true, rmNumber: true, fullName: true } },
            },
          },
          prescriptionItems: { where: { deletedAt: null } },
        },
        orderBy: { prescriptionDate: 'desc' },
        skip,
        take: limit,
      }),
      db.prescription.count({ where }),
    ])

    return NextResponse.json({
      data: prescriptions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[GET /api/prescriptions]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/prescriptions — create prescription with items
export async function POST(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'dokter',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { encounterId, isCompound, notes, items } = body

    if (!encounterId) {
      return NextResponse.json({ error: 'encounterId wajib diisi' }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Item resep wajib diisi minimal 1' }, { status: 400 })
    }

    // Verify encounter
    const encounter = await db.encounter.findFirst({
      where: { id: encounterId, clinicId: perm.clinicId, deletedAt: null },
    })
    if (!encounter) {
      return NextResponse.json({ error: 'Kunjungan tidak ditemukan' }, { status: 404 })
    }

    // Generate prescription number
    const year = new Date().getFullYear()
    const count = await db.prescription.count({
      where: { clinicId: perm.clinicId, prescriptionNo: { startsWith: `RX-${year}` } },
    })
    const prescriptionNo = `RX-${year}-${String(count + 1).padStart(4, '0')}`

    const prescription = await db.prescription.create({
      data: {
        encounterId,
        clinicId: perm.clinicId,
        prescriptionNo,
        prescriptionDate: new Date(),
        isCompound: isCompound || false,
        notes: notes || '',
        status: 'aktif',
        createdBy: perm.userId,
        prescriptionItems: {
          create: items.map((item: Record<string, unknown>) => ({
            medicineId: item.medicineId || '',
            medicineName: item.medicineName || '',
            dose: item.dose || '',
            frequency: item.frequency || '',
            duration: item.duration || '',
            quantity: item.quantity || 1,
            notes: item.notes || '',
            isCompound: item.isCompound || false,
            createdBy: perm.userId,
          })),
        },
      },
      include: { prescriptionItems: true },
    })

    await createAuditLog({
      clinicId: perm.clinicId,
      userId: perm.userId,
      userName: perm.userName,
      action: 'CREATE',
      tableName: 'Prescription',
      recordId: prescription.id,
      newData: JSON.stringify(prescription),
      ipAddress: getClientIp(request),
    })

    return NextResponse.json({ data: prescription }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/prescriptions]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
