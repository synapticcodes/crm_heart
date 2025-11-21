import { useCallback } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { heartSupabase } from '@/lib/supabase-client'
import { useCompany } from '@/app/providers/use-company'
import type { DealRecord, DealStatus } from '@/entities/deal/model'

export const useMoveDeal = () => {
  const { companyId } = useCompany()

  const getBrazilTimestamp = useCallback(() => {
    return formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX")
  }, [])

  const moveDeal = useCallback(
    async (dealId: string, status: DealStatus): Promise<DealRecord> => {
      if (!companyId) {
        throw new Error('Sua conta não está vinculada a nenhuma empresa.')
      }

      const { data, error } = await heartSupabase
        .from('deals')
        .update({ deal_status: status, updated_at: getBrazilTimestamp() })
        .eq('id', dealId)
        .eq('company_id', companyId)
        .select()
        .maybeSingle()

      if (error) {
        console.error('Failed to update deal status', error)
        throw new Error('Não foi possível atualizar o negócio.')
      }

      if (!data) {
        throw new Error('Negócio não encontrado.')
      }

      return data as DealRecord
    },
    [companyId, getBrazilTimestamp],
  )

  return { moveDeal }
}
