'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Con Next.js, queremos que los datos se mantengan frescos
            staleTime: 60 * 1000, // 1 minuto
            refetchOnWindowFocus: false, // No refetch automático al cambiar de ventana
            retry: 1 // Reintentar 1 vez en caso de error
          },
          mutations: {
            retry: false // No reintentar mutaciones
          }
        }
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
