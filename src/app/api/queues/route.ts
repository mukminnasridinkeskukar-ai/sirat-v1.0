import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkPermission, createAuditLog, getClientIp } from '@/lib/auth-helpers'

// GET /api/queues — list queues for a date (default today)
export async function GET(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'dokter', 'perawat_bidan', 'resepsionis_admin',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const status = searchParams.get('status')

    const targetDate = dateStr ? new Date(dateStr) : new Date()
    const start = new Date(targetDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(targetDate)
    end.setHours(23, 59, 59, 999)

    const where: Record<string, unknown> = {
      clinicId: perm.clinicId,
      queueDate: { gte: start, lte: end },
      deletedAt: null,
    }

    if (status) where.status = status

    const queues = await db.queue.findMany({
      where,
      include: {
        patient: { select: { id: true, rmNumber: true, fullName: true, gender: true } },
      },
      orderBy: { queueNumber: 'asc' },
    })

    return NextResponse.json({ data: queues })
  } catch (error) {
    console.error('[GET /api/queues]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/queues — create queue entry (auto-assign number)
export async function POST(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'resepsionis_admin',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { patientId, queueType, notes } = body

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID wajib diisi' }, { status: 400 })
    }

    const today = new Date()
    const start = new Date(today)
    start.setHours(0, 0, 0, 0)
    const end = new Date(today)
    end.setHours(23, 59, 59, 999)

    // Get max queue number for today
    const maxQueue = await db.queue.findFirst({
      where: {
        clinicId: perm.clinicId,
        queueDate: { gte: start, lte: end },
        deletedAt: null,
      },
      orderBy: { queueNumber: 'desc' },
      select: { queueNumber: true },
    })

    const queueNumber = (maxQueue?.queueNumber || 0) + 1

    const queue = await db.queue.create({
      data: {
        clinicId: perm.clinicId,
        patientId,
        queueNumber,
        queueDate: today,
        status: 'menunggu',
        queueType: queueType || 'walk_in',
        notes: notes || '',
        createdBy: perm.userId,
      },
      include: {
        patient: { select: { id: true, rmNumber: true, fullName: true } },
      },
    })

    await createAuditLog({
      clinicId: perm.clinicId,
      userId: perm.userId,
      userName: perm.userName,
      action: 'CREATE',
      tableName: 'Queue',
      recordId: queue.id,
      newData: JSON.stringify(queue),
      ipAddress: getClientIp(request),
    })

    return NextResponse.json({ data: queue }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/queues]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT /api/queues — update queue status
export async function PUT(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'dokter', 'perawat_bidan', 'resepsionis_admin',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, status, encounterId } = body

    if (!id) {
      return NextResponse.json({ error: 'Queue ID wajib diisi' }, { status: 400 })
    }

    const validStatuses = ['menunggu', 'dipanggil', 'sedang_diperiksa', 'selesai', 'dibatalkan']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status harus salah satu dari: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const existing = await db.queue.findFirst({
      where: { id, clinicId: perm.clinicId, deletedAt: null },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Antrian tidak ditemukan' }, { status: 404 })
    }

    const oldData = JSON.stringify(existing)
    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (encounterId !== undefined) updateData.encounterId = encounterId

    const updated = await db.queue.update({
      where: { id },
      data: updateData,
      include: { patient: { select: { id: true, rmNumber: true, fullName: true } } },
    })

    await createAuditLog({
      clinicId: perm.clinicId,
      userId: perm.userId,
      userName: perm.userName,
      action: 'UPDATE',
      tableName: 'Queue',
      recordId: id,
      oldData,
      newData: JSON.stringify(updated),
      ipAddress: getClientIp(request),
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[PUT /api/queues]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
