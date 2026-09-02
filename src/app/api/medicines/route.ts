import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkPermission, createAuditLog, getClientIp } from '@/lib/auth-helpers'

// GET /api/medicines — list with search
export async function GET(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'dokter', 'apoteker', 'resepsionis_admin',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const search = new URL(request.url).searchParams.get('search') || ''
    const page = Math.max(1, Number(new URL(request.url).searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(new URL(request.url).searchParams.get('limit')) || 50))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      clinicId: perm.clinicId,
      deletedAt: null,
      isActive: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { genericName: { contains: search } },
      ]
    }

    const [medicines, total] = await Promise.all([
      db.medicine.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      db.medicine.count({ where }),
    ])

    return NextResponse.json({
      data: medicines,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[GET /api/medicines]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/medicines — add medicine
export async function POST(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'apoteker',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, genericName, category, unit, stock, price, dosageForm, contraindications, interactions } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Nama obat wajib diisi' }, { status: 400 })
    }

    const medicine = await db.medicine.create({
      data: {
        clinicId: perm.clinicId,
        name: name.trim(),
        genericName: genericName || '',
        category: category || '',
        unit: unit || 'tablet',
        stock: Number(stock) || 0,
        price: Number(price) || 0,
        dosageForm: dosageForm || '',
        contraindications: contraindications || '',
        interactions: interactions || '',
        isActive: true,
        createdBy: perm.userId,
      },
    })

    await createAuditLog({
      clinicId: perm.clinicId,
      userId: perm.userId,
      userName: perm.userName,
      action: 'CREATE',
      tableName: 'Medicine',
      recordId: medicine.id,
      newData: JSON.stringify(medicine),
      ipAddress: getClientIp(request),
    })

    return NextResponse.json({ data: medicine }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/medicines]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT /api/medicines — update medicine (stock, price, etc.)
export async function PUT(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'apoteker',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, genericName, category, unit, stock, price, dosageForm, contraindications, interactions, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'Medicine ID wajib diisi' }, { status: 400 })
    }

    const existing = await db.medicine.findFirst({
      where: { id, clinicId: perm.clinicId, deletedAt: null },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Obat tidak ditemukan' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (genericName !== undefined) updateData.genericName = genericName
    if (category !== undefined) updateData.category = category
    if (unit !== undefined) updateData.unit = unit
    if (stock !== undefined) updateData.stock = Number(stock)
    if (price !== undefined) updateData.price = Number(price)
    if (dosageForm !== undefined) updateData.dosageForm = dosageForm
    if (contraindications !== undefined) updateData.contraindications = contraindications
    if (interactions !== undefined) updateData.interactions = interactions
    if (isActive !== undefined) updateData.isActive = isActive

    const oldData = JSON.stringify(existing)
    const updated = await db.medicine.update({ where: { id }, data: updateData })

    await createAuditLog({
      clinicId: perm.clinicId,
      userId: perm.userId,
      userName: perm.userName,
      action: 'UPDATE',
      tableName: 'Medicine',
      recordId: id,
      oldData,
      newData: JSON.stringify(updated),
      ipAddress: getClientIp(request),
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[PUT /api/medicines]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
