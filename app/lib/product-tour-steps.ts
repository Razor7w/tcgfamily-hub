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
      'Inicio: atajos globales. Tiendas: vista de la tienda activa (eventos, correo en tienda). Tu actividad: tus torneos, estadísticas y mazos.',
    placement: 'right',
    skipBeacon: true
  },
  {
    target: tourSelector(PRODUCT_TOUR_TARGETS.dashboardMobileNav),
    title: 'Navegación',
    content:
      'En el celular usa esta barra: Inicio, Tiendas, Tus correos (centro), Mazos y Tu actividad. Tiendas muestra la tienda activa del selector superior.',
    placement: 'top',
    skipBeacon: true
  },
  {
    target: tourSelector(PRODUCT_TOUR_TARGETS.dashboardRegisterMail),
    title: 'Registrar correo',
    content:
      'Añade un envío a la tienda activa del encabezado sin salir del inicio.',
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
    target: tourSelector(PRODUCT_TOUR_TARGETS.dashboardDiscoverCard),
    title: 'Equipos y Championship Points',
    content:
      'Crea tu equipo para jugar en grupo o vincula tus CP desde Ranking Chile. Todo queda guardado en tu perfil.',
    placement: 'bottom',
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
  }
]

export type DashboardTourStepFilter = {
  showStoreSwitcher: boolean
  showRegisterMail: boolean
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
      target === tourSelector(PRODUCT_TOUR_TARGETS.dashboardRegisterMail) &&
      !filter.showRegisterMail
    ) {
      return false
    }
    return true
  })
}
