import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkPermission, createAuditLog, getClientIp } from '@/lib/auth-helpers'

// GET /api/clinic — get clinic info (public, no auth required for login page)
export async function GET() {
  try {
    const clinic = await db.clinic.findFirst({
      where: { isActive: true, deletedAt: null },
    })

    if (!clinic) {
      return NextResponse.json({ error: 'Klinik belum terdaftar' }, { status: 404 })
    }

    return NextResponse.json(clinic)
  } catch (error) {
    console.error('[GET /api/clinic]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/clinic — create or update clinic (onboarding)
export async function POST(request: NextRequest) {
  try {
    // For onboarding, we allow without strict RBAC — but still require headers
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, address, phone, sipDoctor, logoUrl, kopSurat } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Nama klinik wajib diisi' }, { status: 400 })
    }

    const existing = await db.clinic.findFirst({
      where: { id: perm.clinicId, deletedAt: null },
    })

    let clinic
    if (existing) {
      const oldData = JSON.stringify(existing)
      clinic = await db.clinic.update({
        where: { id: existing.id },
        data: {
          name: name.trim(),
          address: address || '',
          phone: phone || '',
          sipDoctor: sipDoctor || '',
          logoUrl: logoUrl || '',
          kopSurat: kopSurat || '',
        },
      })
      await createAuditLog({
        clinicId: perm.clinicId,
        userId: perm.userId,
        userName: perm.userName,
        action: 'UPDATE',
        tableName: 'Clinic',
        recordId: clinic.id,
        oldData,
        newData: JSON.stringify(clinic),
        ipAddress: getClientIp(request),
      })
    } else {
      clinic = await db.clinic.create({
        data: {
          name: name.trim(),
          address: address || '',
          phone: phone || '',
          sipDoctor: sipDoctor || '',
          logoUrl: logoUrl || '',
          kopSurat: kopSurat || '',
          isActive: true,
        },
      })
      await createAuditLog({
        clinicId: clinic.id,
        userId: perm.userId,
        userName: perm.userName,
        action: 'CREATE',
        tableName: 'Clinic',
        recordId: clinic.id,
        newData: JSON.stringify(clinic),
        ipAddress: getClientIp(request),
      })
    }

    return NextResponse.json({ data: clinic })
  } catch (error) {
    console.error('[POST /api/clinic]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
