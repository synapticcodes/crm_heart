import { useCallback, useEffect, useMemo } from 'react'

import type { DealRecord, DealStatus } from '@/entities/deal/model'
import { useFetchKanban } from '@/widgets/deals-board/api/use-fetch-kanban'
import { useMoveDeal } from '@/features/move-deal/model/use-move-deal'
import { useCreateDeal } from '@/features/create-deal/model/use-create-deal'
import { useCompany } from '@/app/providers/use-company'
import { supabase } from '@/lib/supabase-client'

export type DealsByStatus = Record<DealStatus, DealRecord[]>

const initialState: DealsByStatus = {
  negocio_novo: [],
  contrato_enviado: [],
  contrato_assinado: [],
  contrato_rejeitado: [],
}

export const useDealsKanban = () => {
  const { deals, isLoading, error, fetchDeals, setDeals } = useFetchKanban()
  const { moveDeal: apiMoveDeal } = useMoveDeal()
  const { createDeal: apiCreateDeal, upsertDeal: apiUpsertDeal, deleteDeal: apiDeleteDeal } = useCreateDeal()
  const { companyId } = useCompany()

  const updateDealStatus = useCallback(
    async (dealId: string, status: DealStatus) => {
      // Optimistic update
      const updated = await apiMoveDeal(dealId, status)
      setDeals((current) => current.map((deal) => (deal.id === dealId ? updated : deal)))
    },
    [apiMoveDeal, setDeals],
  )

  const createDeal = useCallback(
    async (payload: Partial<DealRecord> & { id?: string }) => {
      const created = await apiCreateDeal(payload)
      setDeals((current) => {
        const next = current.filter((deal) => deal.id !== created.id)
        next.unshift(created)
        return next
      })
      return created
    },
    [apiCreateDeal, setDeals],
  )

  const upsertDeal = useCallback(
    async (payload: Partial<DealRecord> & { id: string }) => {
      const saved = await apiUpsertDeal(payload)
      setDeals((current) => {
        // If it was an update, replace. If new (fallback in upsert), prepend.
        const exists = current.some(d => d.id === saved.id)
        if (exists) {
          return current.map((deal) => (deal.id === saved.id ? saved : deal))
        }
        return [saved, ...current]
      })
      return saved
    },
    [apiUpsertDeal, setDeals],
  )

  const deleteDeal = useCallback(
    async (dealId: string) => {
      await apiDeleteDeal(dealId)
      setDeals((current) => current.filter((deal) => deal.id !== dealId))
    },
    [apiDeleteDeal, setDeals],
  )

  const dealsByStatus = useMemo(() => {
    return deals.reduce<DealsByStatus>((acc, deal) => {
      acc[deal.deal_status]?.push(deal)
      return acc
    }, structuredClone(initialState))
  }, [deals])

  useEffect(() => {
    if (!companyId) return

    const channel = supabase
      .channel(`heart:deals:${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'heart',
          table: 'deals',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE' && payload.old?.id) {
            setDeals((current) => current.filter((deal) => deal.id !== payload.old?.id))
            return
          }

          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const updatedDeal = payload.new as DealRecord
            setDeals((current) => {
              const next = current.filter((deal) => deal.id !== updatedDeal.id)
              next.unshift(updatedDeal)
              return next
            })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [companyId, setDeals])

  return {
    deals,
    dealsByStatus,
    isLoading,
    error,
    fetchDeals,
    updateDealStatus,
    createDeal,
    upsertDeal,
    deleteDeal,
  }
}
