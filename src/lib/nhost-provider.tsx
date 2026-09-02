'use client'

import { useMemo, useState, useEffect, type ReactNode } from 'react'
import { ApolloClient, InMemoryCache } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { createApolloClient } from '@nhost/apollo'
import { isNhostConfigured, nhost, NHOST_GRAPHQL_URL } from '@/lib/nhost'
import { DemoMockLink } from '@/lib/mock-data/resolvers'

/**
 * Production provider: Uses @nhost/apollo's createApolloClient
 * which creates an Apollo Client with:
 * - Auth header injection (Bearer token from Nhost session)
 * - WebSocket subscription link with auth (graphql-ws)
 * - Auto cache reset on sign out
 * - JWT expiration handling with retry
 */
function NhostProductionProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ApolloClient<any> | null>(null)

  useEffect(() => {
    if (!nhost || !NHOST_GRAPHQL_URL) return
    const apolloClient = createApolloClient({
      nhost,
      graphqlUrl: NHOST_GRAPHQL_URL,
    })
    setClient(apolloClient)
  }, [])

  if (!client) {
    return null
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>
}

/**
 * Demo/sandbox provider: Uses local mock Apollo link
 * for development without Nhost backend
 */
function DemoProvider({ children }: { children: ReactNode }) {
  const client = useMemo(
    () =>
      new ApolloClient({
        link: new DemoMockLink(),
        cache: new InMemoryCache(),
        defaultOptions: {
          watchQuery: { fetchPolicy: 'cache-and-network' },
          query: { fetchPolicy: 'network-only' },
        },
      }),
    []
  )
  return <ApolloProvider client={client}>{children}</ApolloProvider>
}

/**
 * Root provider: Automatically selects Nhost production or Demo mode
 * based on NEXT_PUBLIC_NHOST_SUBDOMAIN environment variable.
 */
export function RMEApolloProvider({ children }: { children: ReactNode }) {
  if (isNhostConfigured) {
    return <NhostProductionProvider>{children}</NhostProductionProvider>
  }
  return <DemoProvider>{children}</DemoProvider>
}
