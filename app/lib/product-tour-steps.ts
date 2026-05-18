import type { Step } from 'react-joyride'
import { tourSelector, PRODUCT_TOUR_TARGETS } from '@/lib/product-tour-targets'

export const DASHBOARD_PLAYER_TOUR_STEPS: Step[] = [
  {
    target: tourSelector(PRODUCT_TOUR_TARGETS.storeSwitcher),
    title: 'Tienda activa',
    content:
      'Eventos, correo físico y puntos usan la tienda que elijas aquí. Cámbiala cuando visites otra sede.',
    placement: 'bottom',
    skipBeacon: true
  },
  {
    target: tourSelector(PRODUCT_TOUR_TARGETS.dashboardMainNav),
    title: 'Navegación',
    content:
      'Inicio: atajos globales. Tiendas: vista de la tienda activa (eventos, correo en tienda). Mi cuenta: tus torneos, estadísticas y mazos.',
    placement: 'right',
    skipBeacon: true
  },
  {
    target: tourSelector(PRODUCT_TOUR_TARGETS.dashboardMobileNav),
    title: 'Navegación',
    content:
      'En el celular usa esta barra: Inicio, Tiendas, Mazos y Mi cuenta. Tiendas muestra la tienda activa del selector superior.',
    placement: 'top',
    skipBeacon: true
  },
  {
    target: tourSelector(PRODUCT_TOUR_TARGETS.dashboardQuickActions),
    title: 'Accesos rápidos',
    content:
      'Registrar correo o abrir el generador de lista PDF. Siempre con la tienda del encabezado.',
    placement: 'bottom',
    skipBeacon: true
  },
  {
    target: tourSelector(PRODUCT_TOUR_TARGETS.dashboardCardTiendas),
    title: 'Panel de tienda',
    content:
      'Entra al hub de la tienda activa: calendario semanal, correos pendientes de retiro y el último torneo cerrado.',
    placement: 'top',
    skipBeacon: true
  },
  {
    target: tourSelector(PRODUCT_TOUR_TARGETS.dashboardSuggestionRail),
    title: '¿Alguna idea?',
    content:
      'Puedes enviar una sugerencia para mejorar TCG Nexo (un mensaje por usuario).',
    placement: 'left',
    skipBeacon: true
  }
]

export const STORE_HUB_TOUR_STEPS: Step[] = [
  {
    target: tourSelector(PRODUCT_TOUR_TARGETS.storeHubHeading),
    title: 'Hub de tienda',
    content:
      'Estás en la página de esta tienda. El nombre y logo confirman cuál está activa en tu sesión.',
    placement: 'bottom',
    skipBeacon: true
  },
  {
    target: tourSelector(PRODUCT_TOUR_TARGETS.storeHubWeeklyEvents),
    title: 'Eventos de la semana',
    content:
      'Navega por los días, abre un evento para ver horario, inscripción o resultados si ya terminó.',
    placement: 'top',
    skipBeacon: true
  },
  {
    target: tourSelector(PRODUCT_TOUR_TARGETS.storeHubRightRail),
    title: 'Panel lateral',
    content:
      'Último torneo finalizado (top por categoría) y correos listos para retirar en tienda.',
    placement: 'left',
    skipBeacon: true
  },
  {
    target: tourSelector(PRODUCT_TOUR_TARGETS.storeHubMobileRailHint),
    title: 'Panel en móvil',
    content:
      'Desliza el contenido hacia la izquierda para ver el panel lateral.',
    placement: 'top',
    skipBeacon: true
  }
]

export type DashboardTourStepFilter = {
  showStoreSwitcher: boolean
  showQuickActions: boolean
  showDesktopNav: boolean
  showMobileNav: boolean
}

export function filterDashboardPlayerTourSteps(
  steps: Step[],
  filter: DashboardTourStepFilter
): Step[] {
  return steps.filter(step => {
    const target = typeof step.target === 'string' ? step.target : ''
    if (
      target === tourSelector(PRODUCT_TOUR_TARGETS.storeSwitcher) &&
      !filter.showStoreSwitcher
    ) {
      return false
    }
    if (
      target === tourSelector(PRODUCT_TOUR_TARGETS.dashboardMainNav) &&
      !filter.showDesktopNav
    ) {
      return false
    }
    if (
      target === tourSelector(PRODUCT_TOUR_TARGETS.dashboardMobileNav) &&
      !filter.showMobileNav
    ) {
      return false
    }
    if (
      target === tourSelector(PRODUCT_TOUR_TARGETS.dashboardQuickActions) &&
      !filter.showQuickActions
    ) {
      return false
    }
    return true
  })
}

export function filterStoreHubTourSteps(
  steps: Step[],
  showMobileRailHint: boolean
): Step[] {
  return steps
    .filter(step => {
      const target = typeof step.target === 'string' ? step.target : ''
      if (
        target === tourSelector(PRODUCT_TOUR_TARGETS.storeHubMobileRailHint)
      ) {
        return false
      }
      return true
    })
    .map(step => {
      const target = typeof step.target === 'string' ? step.target : ''
      if (
        target === tourSelector(PRODUCT_TOUR_TARGETS.storeHubRightRail) &&
        showMobileRailHint
      ) {
        return {
          ...step,
          placement: 'bottom' as const,
          offset: 14,
          spotlightPadding: 8,
          spotlightRadius: 16,
          content:
            'Último torneo finalizado (top por categoría) y correos listos para retirar en tienda. Desliza hacia la izquierda para volver al calendario.'
        }
      }
      return step
    })
}
