import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkPermission, createAuditLog, getClientIp } from '@/lib/auth-helpers'
import { createHash } from 'crypto'

// GET /api/patients — list with search & pagination
export async function GET(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'dokter', 'perawat_bidan', 'resepsionis_admin', 'apoteker',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      clinicId: perm.clinicId,
      deletedAt: null,
    }

    if (search) {
      where.OR = [
        { rmNumber: { contains: search } },
        { fullName: { contains: search } },
        { nik: { contains: search } },
      ]
    }

    const [patients, total] = await Promise.all([
      db.patient.findMany({
        where,
        select: {
          id: true, rmNumber: true, nik: true, fullName: true,
          birthPlace: true, birthDate: true, gender: true, address: true,
          phone: true, allergies: true, bloodType: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.patient.count({ where }),
    ])

    return NextResponse.json({
      data: patients,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[GET /api/patients]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/patients — create patient
export async function POST(request: NextRequest) {
  try {
    const perm = await checkPermission(request, [
      'super_admin', 'dokter_pj', 'resepsionis_admin',
    ])
    if (!perm.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { nik, fullName, birthPlace, birthDate, gender, address, phone, allergies, medicalHistory, emergencyContact, emergencyPhone, bloodType } = body

    // Validate NIK: exactly 16 digits
    if (!nik || !/^\d{16}$/.test(nik)) {
      return NextResponse.json({ error: 'NIK harus berupa 16 digit angka' }, { status: 400 })
    }

    if (!fullName || fullName.trim().length === 0) {
      return NextResponse.json({ error: 'Nama lengkap wajib diisi' }, { status: 400 })
    }

    // Check NIK uniqueness
    const existingNik = await db.patient.findFirst({ where: { nik, deletedAt: null } })
    if (existingNik) {
      return NextResponse.json({ error: 'NIK sudah terdaftar' }, { status: 409 })
    }

    // Generate RM number: RM-YYYY-XXXX
    const year = new Date().getFullYear()
    const countThisYear = await db.patient.count({
      where: {
        clinicId: perm.clinicId,
        rmNumber: { startsWith: `RM-${year}` },
        deletedAt: null,
      },
    })
    const rmNumber = `RM-${year}-${String(countThisYear + 1).padStart(4, '0')}`

    // NIK hash for search index
    const nikHash = createHash('sha256').update(nik).digest('hex')

    // Check RM uniqueness (shouldn't happen but safety check)
    const existingRm = await db.patient.findFirst({ where: { rmNumber, deletedAt: null } })
    if (existingRm) {
      return NextResponse.json({ error: 'Nomor RM sudah ada, coba lagi' }, { status: 409 })
    }

    const patient = await db.patient.create({
      data: {
        clinicId: perm.clinicId,
        rmNumber,
        nik,
        nikHash,
        fullName: fullName.trim(),
        birthPlace: birthPlace || '',
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender || 'L',
        address: address || '',
        phone: phone || '',
        allergies: typeof allergies === 'string' ? allergies : JSON.stringify(allergies || []),
        medicalHistory: typeof medicalHistory === 'string' ? medicalHistory : JSON.stringify(medicalHistory || []),
        emergencyContact: emergencyContact || '',
        emergencyPhone: emergencyPhone || '',
        bloodType: bloodType || '',
        createdBy: perm.userId,
      },
    })

    await createAuditLog({
      clinicId: perm.clinicId,
      userId: perm.userId,
      userName: perm.userName,
      action: 'CREATE',
      tableName: 'Patient',
      recordId: patient.id,
      newData: JSON.stringify(patient),
      ipAddress: getClientIp(request),
    })

    return NextResponse.json({ data: patient }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/patients]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
