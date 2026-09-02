import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkPermission, createAuditLog, getClientIp } from '@/lib/auth-helpers'

// GET /api/soap?encounterId= — get SOAP note by encounter
export async function GET(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'dokter', 'perawat_bidan', 'apoteker',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const encounterId = new URL(request.url).searchParams.get('encounterId')
    if (!encounterId) {
      return NextResponse.json({ error: 'encounterId wajib diisi' }, { status: 400 })
    }

    const soap = await db.soapNote.findFirst({
      where: { encounterId, clinicId: perm.clinicId, deletedAt: null },
      include: {
        doctor: { select: { id: true, fullName: true, specialty: true } },
      },
    })

    if (!soap) {
      return NextResponse.json({ data: null })
    }

    return NextResponse.json({ data: soap })
  } catch (error) {
    console.error('[GET /api/soap]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/soap — create or update SOAP note
export async function POST(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'dokter',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { encounterId, subjective, objective, assessment, plan, instructions } = body

    if (!encounterId) {
      return NextResponse.json({ error: 'encounterId wajib diisi' }, { status: 400 })
    }

    // Verify encounter exists and belongs to this clinic
    const encounter = await db.encounter.findFirst({
      where: { id: encounterId, clinicId: perm.clinicId, deletedAt: null },
    })
    if (!encounter) {
      return NextResponse.json({ error: 'Kunjungan tidak ditemukan' }, { status: 404 })
    }

    // Check if SOAP already exists (upsert)
    const existing = await db.soapNote.findFirst({
      where: { encounterId, deletedAt: null },
    })

    let soap: typeof existing
    const soapData = {
      subjective: subjective || '',
      objective: objective || '',
      assessment: assessment || '',
      plan: plan || '',
      instructions: instructions || '',
    }

    if (existing) {
      if (existing.isLocked) {
        return NextResponse.json({ error: 'Catatan SOAP sudah dikunci' }, { status: 400 })
      }
      const oldData = JSON.stringify(existing)
      soap = await db.soapNote.update({
        where: { id: existing.id },
        data: soapData,
      })
      await createAuditLog({
        clinicId: perm.clinicId,
        userId: perm.userId,
        userName: perm.userName,
        action: 'UPDATE',
        tableName: 'SoapNote',
        recordId: existing.id,
        oldData,
        newData: JSON.stringify(soap),
        ipAddress: getClientIp(request),
      })
    } else {
      soap = await db.soapNote.create({
        data: {
          encounterId,
          clinicId: perm.clinicId,
          doctorId: perm.userId,
          ...soapData,
          createdBy: perm.userId,
        },
      })
      await createAuditLog({
        clinicId: perm.clinicId,
        userId: perm.userId,
        userName: perm.userName,
        action: 'CREATE',
        tableName: 'SoapNote',
        recordId: soap.id,
        newData: JSON.stringify(soap),
        ipAddress: getClientIp(request),
      })
    }

    return NextResponse.json({ data: soap })
  } catch (error) {
    console.error('[POST /api/soap]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
