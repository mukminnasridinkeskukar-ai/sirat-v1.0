import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkPermission, createAuditLog, getClientIp } from '@/lib/auth-helpers'

// GET /api/invoices — list with filters
export async function GET(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'resepsionis_admin', 'apoteker',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const status = searchParams.get('status')
    const date = searchParams.get('date')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      clinicId: perm.clinicId,
      deletedAt: null,
    }

    if (patientId) where.patientId = patientId
    if (status) where.paymentStatus = status
    if (date) {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      where.invoiceDate = { gte: start, lte: end }
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          patient: { select: { id: true, rmNumber: true, fullName: true } },
          invoiceItems: { where: { deletedAt: null } },
        },
        orderBy: { invoiceDate: 'desc' },
        skip,
        take: limit,
      }),
      db.invoice.count({ where }),
    ])

    return NextResponse.json({
      data: invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[GET /api/invoices]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/invoices — create invoice with items
export async function POST(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'resepsionis_admin',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { patientId, encounterId, paymentMethod, discount, notes, items } = body

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID wajib diisi' }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Item invoice wajib diisi minimal 1' }, { status: 400 })
    }

    // Calculate totals
    let subtotal = 0
    const itemData = items.map((item: Record<string, unknown>) => {
      const qty = Number(item.quantity) || 1
      const unitPrice = Number(item.unitPrice) || 0
      const total = qty * unitPrice
      subtotal += total
      return {
        itemType: item.itemType || 'tindakan',
        itemName: item.itemName || '',
        quantity: qty,
        unitPrice,
        total,
      }
    })

    const discountAmt = Number(discount) || 0
    const total = Math.max(0, subtotal - discountAmt)

    // Generate invoice number
    const year = new Date().getFullYear()
    const count = await db.invoice.count({
      where: { clinicId: perm.clinicId, invoiceNo: { startsWith: `INV-${year}` } },
    })
    const invoiceNo = `INV-${year}-${String(count + 1).padStart(4, '0')}`

    const invoice = await db.invoice.create({
      data: {
        clinicId: perm.clinicId,
        patientId,
        encounterId: encounterId || '',
        invoiceNo,
        invoiceDate: new Date(),
        subtotal,
        discount: discountAmt,
        total,
        paymentMethod: paymentMethod || 'cash',
        paymentStatus: 'belum_bayar',
        notes: notes || '',
        createdBy: perm.userId,
        invoiceItems: { create: itemData },
      },
      include: { invoiceItems: true },
    })

    await createAuditLog({
      clinicId: perm.clinicId,
      userId: perm.userId,
      userName: perm.userName,
      action: 'CREATE',
      tableName: 'Invoice',
      recordId: invoice.id,
      newData: JSON.stringify(invoice),
      ipAddress: getClientIp(request),
    })

    return NextResponse.json({ data: invoice }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/invoices]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT /api/invoices — mark as paid
export async function PUT(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'resepsionis_admin',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, paymentMethod } = body

    if (!id) {
      return NextResponse.json({ error: 'Invoice ID wajib diisi' }, { status: 400 })
    }

    const existing = await db.invoice.findFirst({
      where: { id, clinicId: perm.clinicId, deletedAt: null },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Invoice tidak ditemukan' }, { status: 404 })
    }

    if (existing.paymentStatus === 'lunas') {
      return NextResponse.json({ error: 'Invoice sudah lunas' }, { status: 400 })
    }

    const oldData = JSON.stringify(existing)
    const updated = await db.invoice.update({
      where: { id },
      data: {
        paymentStatus: 'lunas',
        paidAt: new Date(),
        ...(paymentMethod ? { paymentMethod } : {}),
      },
      include: { invoiceItems: true },
    })

    await createAuditLog({
      clinicId: perm.clinicId,
      userId: perm.userId,
      userName: perm.userName,
      action: 'UPDATE',
      tableName: 'Invoice',
      recordId: id,
      oldData,
      newData: JSON.stringify(updated),
      ipAddress: getClientIp(request),
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[PUT /api/invoices]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
