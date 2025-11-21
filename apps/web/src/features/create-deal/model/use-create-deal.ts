import { useCallback } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { heartSupabase } from '@/lib/supabase-client'
import { useCompany } from '@/app/providers/use-company'
import type { DealRecord } from '@/entities/deal/model'

export const useCreateDeal = () => {
  const { companyId } = useCompany()

  const getBrazilTimestamp = useCallback(() => {
    return formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX")
  }, [])

  const createDeal = useCallback(
    async (payload: Partial<DealRecord> & { id?: string }): Promise<DealRecord> => {
      if (!companyId) {
        throw new Error('Sua conta não está vinculada a nenhuma empresa.')
      }

      const timestamp = getBrazilTimestamp()
      const insertPayload = {
        ...payload,
        company_id: payload.company_id ?? companyId,
        deal_status: payload.deal_status ?? 'negocio_novo',
        created_at: payload.created_at ?? timestamp,
        updated_at: payload.updated_at ?? timestamp,
      }

      const { data, error } = await heartSupabase
        .from('deals')
        .insert(insertPayload)
        .select()
        .maybeSingle()

      if (error) {
        console.error('Failed to create deal', error)
        throw new Error('Não foi possível criar o negócio.')
      }

      if (!data) {
        throw new Error('Não foi possível criar o negócio.')
      }

      return data as DealRecord
    },
    [companyId, getBrazilTimestamp],
  )

  const upsertDeal = useCallback(
    async (payload: Partial<DealRecord> & { id: string }): Promise<DealRecord> => {
      if (!companyId) {
        throw new Error('Sua conta não está vinculada a nenhuma empresa.')
      }

      const { data, error } = await heartSupabase
        .from('deals')
        .update({ ...payload, company_id: payload.company_id ?? companyId, updated_at: getBrazilTimestamp() })
        .eq('id', payload.id)
        .eq('company_id', companyId)
        .select()
        .maybeSingle()

      if (error) {
        console.error('Failed to update deal', error)
        throw new Error('Não foi possível salvar o negócio.')
      }

      if (!data) {
        return createDeal(payload)
      }

      return data as DealRecord
    },
    [companyId, createDeal, getBrazilTimestamp],
  )

  const deleteDeal = useCallback(
    async (dealId: string) => {
      if (!companyId) {
        throw new Error('Sua conta não está vinculada a nenhuma empresa.')
      }

      const { error } = await heartSupabase.from('deals').delete().eq('id', dealId).eq('company_id', companyId)

      if (error) {
        console.error('Failed to delete deal', error)
        throw new Error('Não foi possível excluir o negócio.')
      }
    },
    [companyId],
  )

  return { createDeal, upsertDeal, deleteDeal }
}
