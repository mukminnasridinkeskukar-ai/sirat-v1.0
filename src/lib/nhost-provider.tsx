'use client'

import { useMemo, type ReactNode } from 'react'
import { ApolloClient, InMemoryCache } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { isNhostConfigured } from '@/lib/nhost'
import { DemoMockLink } from '@/lib/mock-data/resolvers'

function createNhostClient() {
  return new ApolloClient({ cache: new InMemoryCache() })
}

function createDemoClient() {
  return new ApolloClient({
    link: new DemoMockLink(),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network' },
      query: { fetchPolicy: 'network-only' },
    },
  })
}

export function RMEApolloProvider({ children }: { children: ReactNode }) {
  const client = useMemo(
    () => (isNhostConfigured ? createNhostClient() : createDemoClient()),
    []
  )
  return <ApolloProvider client={client}>{children}</ApolloProvider>
}
