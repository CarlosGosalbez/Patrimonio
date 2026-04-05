'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DashboardWidgetId } from '@/lib/dashboard/types'

const defaultOrder: DashboardWidgetId[] = [
  'monthly-balance',
  'projected-flow',
  'top-categories',
  'upcoming-commitments',
  'upcoming-deadlines',
  'portfolio',
  'active-alerts',
  'recent-transactions',
]

interface DashboardPreferencesState {
  hidden: DashboardWidgetId[]
  order: DashboardWidgetId[]
  moveWidget: (widgetId: DashboardWidgetId, targetIndex: number) => void
  reset: () => void
  toggleWidget: (widgetId: DashboardWidgetId) => void
}

export const useDashboardPreferencesStore = create<DashboardPreferencesState>()(
  persist(
    (set) => ({
      hidden: [],
      order: defaultOrder,
      moveWidget: (widgetId, targetIndex) =>
        set((state) => {
          const next = [...state.order]
          const currentIndex = next.indexOf(widgetId)

          if (currentIndex === -1 || currentIndex === targetIndex) {
            return state
          }

          next.splice(currentIndex, 1)
          next.splice(targetIndex, 0, widgetId)

          return { order: next }
        }),
      reset: () => ({
        hidden: [],
        order: defaultOrder,
      }),
      toggleWidget: (widgetId) =>
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
