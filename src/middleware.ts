import { NextResponse, type NextRequest } from 'next/server'

// Nhost session token cookie name
const NHOST_SESSION_COOKIE = 'nhost-session-token'

// Routes that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/seed']

// Role-based page access (maps page paths to allowed roles)
// When Nhost is not configured, all routes are allowed (demo mode)
const ROLE_PATH_MAP: Record<string, string[]> = {
  '/pasien': ['super_admin', 'dokter_pj', 'dokter', 'perawat_bidan', 'resepsionis_admin'],
  '/antrian': ['super_admin', 'dokter_pj', 'dokter', 'perawat_bidan', 'resepsionis_admin'],
  '/pelayanan': ['super_admin', 'dokter_pj', 'dokter', 'perawat_bidan'],
  '/resep': ['super_admin', 'dokter_pj', 'dokter', 'apoteker'],
  '/billing': ['super_admin', 'resepsionis_admin'],
  '/laporan': ['super_admin', 'dokter_pj', 'dokter'],
  '/audit': ['super_admin'],
  '/master-obat': ['super_admin', 'apoteker'],
  '/pengaturan': ['super_admin'],
}

function decodeJwtPayload(token: string): Record<string, string> | null {
  try {
    const base64 = token.split('.')[1]
    if (!base64) return null
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip non-page routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_vercel') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots.txt') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next()
  }

  // Allow public paths without auth
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    // If user is already authenticated and visiting /login, redirect to /
    const sessionToken = request.cookies.get(NHOST_SESSION_COOKIE)?.value
    if (sessionToken && pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Check for Nhost session token
  const sessionToken = request.cookies.get(NHOST_SESSION_COOKIE)?.value

  // If no session token, redirect to login
  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Decode JWT and check role
  const claims = decodeJwtPayload(sessionToken)
  if (!claims) {
    // Invalid token, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check if token is expired
  const exp = claims['exp']
  if (exp) {
    const expMs = Number(exp) * 1000
    if (Date.now() > expMs) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      // Clear the expired cookie
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete(NHOST_SESSION_COOKIE)
      return response
    }
  }

  // Role-based access control
  // In SPA mode, all pages are served from / so we check if the user
  // has ANY access to the app. Fine-grained role checks happen client-side.
  const userRole = claims['x-hasura-role'] || claims['https://hasura.io/jwt/claims']?.role
  
  if (!userRole) {
    // No role in token - allow but warn
    // The client-side will handle the role display
    return NextResponse.next()
  }

  // For SPA routing (all pages served from /), we don't block at middleware level
  // Client-side AppShell handles role-based nav visibility
  return NextResponse.next()
}

export const config = {
  // Match all page routes except static files and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
}
