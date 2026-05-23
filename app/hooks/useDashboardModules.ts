import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  DashboardModuleSettingsDTO,
  DashboardShortcutsVisibility,
  StoreCreditAdminSettings
} from '@/lib/dashboard-module-config'
import { MAIL_REGISTER_DAILY_LIMIT } from '@/lib/mail-register-constants'
import { useDashboardStoreQueryKey } from '@/hooks/use-dashboard-store-key'

export type AdminConfiguracionData = {
  settings: DashboardModuleSettingsDTO
  resendNotifyPickupInStoreEnabled: boolean
  mailRegisterDailyLimit: number
  storeCredit: StoreCreditAdminSettings
}

/** Configuración admin: bloques del dashboard + correo Resend (requiere owner; alcance = tienda activa). */
export function useAdminConfiguracion() {
  const storeKey = useDashboardStoreQueryKey()
  return useQuery<AdminConfiguracionData>({
    queryKey: ['admin', 'configuracion', storeKey],
    enabled: storeKey !== 'none',
    queryFn: async () => {
      const response = await fetch('/api/admin/configuracion')
      if (!response.ok) {
        throw new Error('Error al cargar configuración')
      }
      const data = (await response.json()) as {
        settings?: DashboardModuleSettingsDTO
        resendNotifyPickupInStoreEnabled?: boolean
        mailRegisterDailyLimit?: number
        storeCredit?: StoreCreditAdminSettings
      }
      if (!data.settings) {
        throw new Error('Respuesta inválida')
      }
      return {
        settings: data.settings,
        resendNotifyPickupInStoreEnabled:
          data.resendNotifyPickupInStoreEnabled !== false,
        mailRegisterDailyLimit:
          typeof data.mailRegisterDailyLimit === 'number'
            ? data.mailRegisterDailyLimit
            : MAIL_REGISTER_DAILY_LIMIT,
        storeCredit: data.storeCredit ??
          data.settings.storeCredit ?? {
            csvEnabled: true,
            tournamentPointsEnabled: false,
            tournamentPointsCustomName: '',
            tournamentPointsLabel: 'Puntos por torneo'
          }
      }
    },
    staleTime: 60_000
  })
}

export function useUpdateDashboardModuleSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: DashboardModuleSettingsDTO) => {
      const response = await fetch('/api/admin/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(
          typeof err.error === 'string' ? err.error : 'Error al guardar'
        )
      }
      const data = await response.json()
      return data.settings as DashboardModuleSettingsDTO
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'configuracion'] })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'tournament-points']
      })
    }
  })
}

export function useUpdateDashboardShortcuts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shortcuts: DashboardShortcutsVisibility) => {
      const response = await fetch('/api/admin/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcuts })
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(
          typeof err.error === 'string' ? err.error : 'Error al guardar'
        )
      }
      const data = await response.json()
      return data.settings as DashboardModuleSettingsDTO
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'configuracion'] })
    }
  })
}

export function useUpdateResendPickupNotifySettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (resendNotifyPickupInStoreEnabled: boolean) => {
      const response = await fetch('/api/admin/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resendNotifyPickupInStoreEnabled })
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(
          typeof err.error === 'string' ? err.error : 'Error al guardar'
        )
      }
      return response.json() as Promise<AdminConfiguracionData>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'configuracion'] })
    }
  })
}

export function useUpdateMailRegisterDailyLimit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mailRegisterDailyLimit: number) => {
      const response = await fetch('/api/admin/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailRegisterDailyLimit })
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(
          typeof err.error === 'string' ? err.error : 'Error al guardar'
        )
      }
      return response.json() as Promise<AdminConfiguracionData>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'configuracion'] })
      queryClient.invalidateQueries({ queryKey: ['mail-register-quota'] })
    }
  })
}
