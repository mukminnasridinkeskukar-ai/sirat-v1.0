import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkPermission } from '@/lib/auth-helpers'

// GET /api/icd?search=code_or_name&limit=20
export async function GET(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'dokter', 'perawat_bidan', 'apoteker', 'resepsionis_admin',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20))

    if (!search) {
      return NextResponse.json({ data: [] })
    }

    const icd10Codes = await db.icd10.findMany({
      where: {
        OR: [
          { code: { contains: search } },
          { name: { contains: search } },
        ],
      },
      orderBy: { code: 'asc' },
      take: limit,
    })

    return NextResponse.json({ data: icd10Codes })
  } catch (error) {
    console.error('[GET /api/icd]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
