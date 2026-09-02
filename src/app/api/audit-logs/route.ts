import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkPermission } from '@/lib/auth-helpers'

// GET /api/audit-logs — list with pagination and filters (immutable, no DELETE)
export async function GET(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const tableName = searchParams.get('tableName')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 50))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      clinicId: perm.clinicId,
    }

    if (tableName) where.tableName = tableName
    if (userId) where.userId = userId
    if (startDate || endDate) {
      where.createdAt = {} as Record<string, unknown>
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        ;(where.createdAt as Record<string, unknown>).lte = end
      }
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, userId: true, userName: true, action: true,
          tableName: true, recordId: true, oldData: true, newData: true,
          ipAddress: true, createdAt: true,
        },
      }),
      db.auditLog.count({ where }),
    ])

    return NextResponse.json({
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[GET /api/audit-logs]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
