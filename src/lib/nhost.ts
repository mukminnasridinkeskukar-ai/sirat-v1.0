import { NhostClient } from '@nhost/nextjs'

const NHOST_SUBDOMAIN = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || ''
const NHOST_REGION = process.env.NEXT_PUBLIC_NHOST_REGION || 'ap-southeast-1'

export const isNhostConfigured = Boolean(NHOST_SUBDOMAIN)

// When Nhost env vars are set → real Nhost client
// When not set → demo mode (sandbox)
export const nhost = NHOST_SUBDOMAIN
  ? new NhostClient({
      subdomain: NHOST_SUBDOMAIN,
      region: NHOST_REGION,
    })
  : (null as unknown as NhostClient)

// Convenience: the GraphQL endpoint URL (used by Apollo)
export const NHOST_GRAPHQL_URL = NHOST_SUBDOMAIN
  ? `https://${NHOST_SUBDOMAIN}.graphql.${NHOST_REGION}.nhost.run/v1/graphql`
  : ''

// Convenience: the Auth endpoint URL
export const NHOST_AUTH_URL = NHOST_SUBDOMAIN
  ? `https://${NHOST_SUBDOMAIN}.auth.${NHOST_REGION}.nhost.run/v1`
  : ''
