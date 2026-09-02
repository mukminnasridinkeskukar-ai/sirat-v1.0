import { NextRequest } from 'next/server'
import { db } from './db'

export interface PermissionResult {
  allowed: boolean
  userId: string
  clinicId: string
  userRole: string
  userName: string
}

/**
 * Check if the current user has one of the allowed roles.
 * Reads the x-user-id, x-clinic-id, x-user-role headers (set by auth middleware).
 */
export async function checkPermission(
  request: NextRequest,
  allowedRoles: string[]
): Promise<PermissionResult> {
  const userId = request.headers.get('x-user-id') || ''
  const clinicId = request.headers.get('x-clinic-id') || ''
  const userRole = request.headers.get('x-user-role') || ''
  const userName = request.headers.get('x-user-name') || ''

  if (!userId || !clinicId || !userRole) {
    return { allowed: false, userId: '', clinicId: '', userRole: '', userName: '' }
  }

  const allowed = allowedRoles.includes(userRole)
  return { allowed, userId, clinicId, userRole, userName }
}

/** Helper to get client IP */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || '127.0.0.1'
}

/** Helper to create an audit log entry */
export async function createAuditLog(params: {
  clinicId: string
  userId: string
  userName: string
  action: string
  tableName: string
  recordId: string
  oldData?: string
  newData?: string
  ipAddress: string
}) {
  return db.auditLog.create({
    data: {
      clinicId: params.clinicId,
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      tableName: params.tableName,
      recordId: params.recordId,
      oldData: params.oldData || '',
      newData: params.newData || '',
      ipAddress: params.ipAddress,
    },
  })
}
