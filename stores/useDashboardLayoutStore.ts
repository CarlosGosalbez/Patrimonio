'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DashboardWidgetId =
  | 'monthly-balance'
  | 'projected-flow'
  | 'top-categories'
  | 'upcoming-commitments'
  | 'portfolio'
  | 'active-alerts'
  | 'recent-transactions'

export const dashboardWidgetIds: DashboardWidgetId[] = [
  'monthly-balance',
  'projected-flow',
  'top-categories',
  'upcoming-commitments',
  'portfolio',
  'active-alerts',
  'recent-transactions',
]

interface DashboardLayoutState {
  hidden: DashboardWidgetId[]
  moveWidget: (activeId: DashboardWidgetId, targetId: DashboardWidgetId) => void
  order: DashboardWidgetId[]
  reset: () => void
  toggleHidden: (widgetId: DashboardWidgetId) => void
}

function reorder(
  order: DashboardWidgetId[],
  activeId: DashboardWidgetId,
  targetId: DashboardWidgetId,
) {
  const next = [...order]
  const activeIndex = next.indexOf(activeId)
  const targetIndex = next.indexOf(targetId)

  if (activeIndex === -1 || targetIndex === -1 || activeIndex === targetIndex) {
    return next
  }

  next.splice(activeIndex, 1)
  next.splice(targetIndex, 0, activeId)
  return next
}

export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  persist(
    (set) => ({
      hidden: [],
      moveWidget: (activeId, targetId) =>
        set((state) => ({
          order: reorder(state.order, activeId, targetId),
        })),
      order: dashboardWidgetIds,
      reset: () =>
        set({
          hidden: [],
          order: dashboardWidgetIds,
        }),
      toggleHidden: (widgetId) =>
        set((state) => ({
          hidden: state.hidden.includes(widgetId)
            ? state.hidden.filter((id) => id !== widgetId)
            : [...state.hidden, widgetId],
        })),
    }),
    {
      name: 'patrimio-dashboard-layout',
      partialize: (state) => ({
        hidden: state.hidden,
        order: state.order,
      }),
    },
  ),
)
