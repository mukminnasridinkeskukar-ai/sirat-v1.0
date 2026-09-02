---
Task ID: 1
Agent: main
Task: Build Next.js 14 RME frontend connected to Nhost Backend

Work Log:
- Installed @nhost/nextjs, @nhost/react-apollo, @apollo/client v4, graphql
- Created Nhost client config (src/lib/nhost.ts) with env-based detection
- Created RMEApolloProvider with demo mode fallback (custom DemoMockLink)
- Created 25+ GraphQL queries/mutations for all 19 RME entities
- Built comprehensive mock data layer (10 patients, 15 medicines, 30 ICD-10, 6 queues, 5 encounters, etc.)
- Rebuilt LoginPage with Nhost Auth + demo fallback (medical blue #0E73F6 theme)
- Built PatientSearch component with NIK/RM autocomplete via GraphQL
- Built SOAPForm with 4 tabs (Vital/S/O/A+P) + ICD-10 GraphQL autocomplete
- Built E-Prescription builder with drug interaction check
- Updated AppShell with medical blue theme and Nhost signOut
- Created JWT middleware for role-based access (removed deprecated version)
- Updated globals.css with #0E73F6 medical blue theme
- Created .env.example for Vercel deployment
- Fixed localStorage key mismatch bug (rme_user -> rme_auth)
- Fixed demo clinic ID mismatch (now fetches real ID from seed)

Stage Summary:
- Complete Nhost-ready frontend architecture
- Demo mode works with SQLite/REST API backend
- Production mode connects to Nhost via NEXT_PUBLIC_NHOST_SUBDOMAIN
- All components use shadcn/ui with medical blue #0E73F6 theme
- Lint passes with zero errors
- Page compiles successfully (GET / 200)
