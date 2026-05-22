import type { Metadata } from 'next'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/auth'
import ThemeRegistry from '@/components/ThemeRegistry'
import MustChangePasswordRedirect from '@/components/auth/MustChangePasswordRedirect'
import ProfileCompletionGate from '@/components/auth/ProfileCompletionGate'
import { QueryProvider } from '@/lib/query-client'
import { outfit } from '@/fonts'
import { rootSiteMetadata } from '@/lib/site-metadata'

export const metadata: Metadata = rootSiteMetadata

export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="es" className={outfit.variable}>
      <body>
        <AppRouterCacheProvider>
          <QueryProvider>
            <ThemeRegistry>
              <SessionProvider session={session}>
                <MustChangePasswordRedirect />
                <ProfileCompletionGate />
                {children}
              </SessionProvider>
            </ThemeRegistry>
          </QueryProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
