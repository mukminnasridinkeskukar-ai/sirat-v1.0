import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkPermission } from '@/lib/auth-helpers'

// GET /api/reports?type=daily-visits&date=YYYY-MM-DD
// GET /api/reports?type=top-diseases&period=month
// GET /api/reports?type=revenue&period=month
export async function GET(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'resepsionis_admin',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || ''

    if (type === 'daily-visits') {
      return getDailyVisits(searchParams, perm.clinicId)
    } else if (type === 'top-diseases') {
      return getTopDiseases(searchParams, perm.clinicId)
    } else if (type === 'revenue') {
      return getRevenue(searchParams, perm.clinicId)
    }

    return NextResponse.json({ error: 'Tipe report tidak valid. Gunakan: daily-visits, top-diseases, revenue' }, { status: 400 })
  } catch (error) {
    console.error('[GET /api/reports]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function getDailyVisits(params: URLSearchParams, clinicId: string) {
  const dateStr = params.get('date') || new Date().toISOString().split('T')[0]
  const start = new Date(dateStr)
  start.setHours(0, 0, 0, 0)
  const end = new Date(dateStr)
  end.setHours(23, 59, 59, 999)

  const [encounters, queues] = await Promise.all([
    db.encounter.findMany({
      where: { clinicId, encounterDate: { gte: start, lte: end }, deletedAt: null },
      include: {
        doctor: { select: { fullName: true } },
        patient: { select: { fullName: true, gender: true } },
      },
      orderBy: { encounterDate: 'asc' },
    }),
    db.queue.count({
      where: { clinicId, queueDate: { gte: start, lte: end }, deletedAt: null },
    }),
  ])

  const byType = { rawat_jalan: 0, rawat_inap: 0, emergency: 0 }
  const byStatus = { berlangsung: 0, selesai: 0, dibatalkan: 0 }
  for (const e of encounters) {
    if (e.encounterType in byType) (byType as Record<string, number>)[e.encounterType]++
    if (e.status in byStatus) (byStatus as Record<string, number>)[e.status]++
  }

  return NextResponse.json({
    type: 'daily-visits',
    date: dateStr,
    summary: {
      totalEncounters: encounters.length,
      totalQueues: queues,
      byType,
      byStatus,
    },
    encounters,
  })
}

async function getTopDiseases(params: URLSearchParams, clinicId: string) {
  const period = params.get('period') || 'month'
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - (period === 'year' ? 12 : period === 'week' ? 1 : period === 'quarter' ? 3 : 1), 1)

  const diagnoses = await db.diagnosis.findMany({
    where: {
      clinicId,
      createdAt: { gte: start },
      deletedAt: null,
    },
    select: { icd10Code: true, icd10Name: true },
  })

  const counts = new Map<string, { code: string; name: string; count: number }>()
  for (const d of diagnoses) {
    const key = d.icd10Code
    if (counts.has(key)) {
      counts.get(key)!.count++
    } else {
      counts.set(key, { code: d.icd10Code, name: d.icd10Name, count: 1 })
    }
  }

  const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 20)

  return NextResponse.json({
    type: 'top-diseases',
    period,
    startDate: start.toISOString(),
    endDate: now.toISOString(),
    data: sorted,
  })
}

async function getRevenue(params: URLSearchParams, clinicId: string) {
  const period = params.get('period') || 'month'
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - (period === 'year' ? 12 : period === 'week' ? 1 : period === 'quarter' ? 3 : 1), 1)

  const invoices = await db.invoice.findMany({
    where: {
      clinicId,
      invoiceDate: { gte: start },
      deletedAt: null,
    },
    select: {
      invoiceDate: true, subtotal: true, discount: true, total: true, paymentStatus: true, paymentMethod: true,
    },
    orderBy: { invoiceDate: 'asc' },
  })

  const totalRevenue = invoices.filter(i => i.paymentStatus === 'lunas').reduce((s, i) => s + i.total, 0)
  const totalUnpaid = invoices.filter(i => i.paymentStatus === 'belum_bayar').reduce((s, i) => s + i.total, 0)
  const totalInvoices = invoices.length
  const paidCount = invoices.filter(i => i.paymentStatus === 'lunas').length

  // Group by month
  const byMonth = new Map<string, { month: string; revenue: number; unpaid: number; count: number }>()
  for (const inv of invoices) {
    const monthKey = inv.invoiceDate.toISOString().slice(0, 7)
    if (byMonth.has(monthKey)) {
      const entry = byMonth.get(monthKey)!
      if (inv.paymentStatus === 'lunas') entry.revenue += inv.total
      else entry.unpaid += inv.total
      entry.count++
    } else {
      byMonth.set(monthKey, {
        month: monthKey,
        revenue: inv.paymentStatus === 'lunas' ? inv.total : 0,
        unpaid: inv.paymentStatus === 'belum_bayar' ? inv.total : 0,
        count: 1,
      })
    }
  }

  return NextResponse.json({
    type: 'revenue',
    period,
    startDate: start.toISOString(),
    endDate: now.toISOString(),
    summary: {
      totalRevenue,
      totalUnpaid,
      totalInvoices,
      paidCount,
      unpaidCount: totalInvoices - paidCount,
    },
    byMonth: Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month)),
  })
}
