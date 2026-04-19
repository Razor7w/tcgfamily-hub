'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { DashboardModuleSettingsDTO } from '@/lib/dashboard-module-config'

const DashboardModulesContext =
  createContext<DashboardModuleSettingsDTO | null>(null)

export function DashboardModulesProvider({
  settings,
  children
}: {
  settings: DashboardModuleSettingsDTO
  children: ReactNode
}) {
  return (
    <DashboardModulesContext.Provider value={settings}>
      {children}
    </DashboardModulesContext.Provider>
  )
}

/** Configuración del panel inyectada en el layout de /dashboard (sin fetch público). */
export function useDashboardModulesFromLayout(): DashboardModuleSettingsDTO {
  const v = useContext(DashboardModulesContext)
  if (v == null) {
    throw new Error(
      'useDashboardModulesFromLayout solo debe usarse bajo el layout de /dashboard'
    )
  }
  return v
}
