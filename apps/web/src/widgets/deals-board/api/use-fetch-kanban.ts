import { useCallback, useState } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { heartSupabase } from '@/lib/supabase-client'
import { useCompany } from '@/app/providers/use-company'
import type { DealRecord, DealStatus } from '@/entities/deal/model'

export const useFetchKanban = () => {
  const [deals, setDeals] = useState<DealRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { companyId, isLoading: isCompanyLoading, error: companyError } = useCompany()

  const fetchDeals = useCallback(
    async (options: { searchTerm?: string; dateRange?: { start: string | null; end: string | null } } = {}) => {
      setIsLoading(true)
      setError(null)

      if (!companyId) {
        if (!isCompanyLoading) {
          setError(companyError ?? 'Sua conta não está vinculada a nenhuma empresa.')
        }
        setDeals([])
        setIsLoading(false)
        return
      }

      let query = heartSupabase
        .from('deals')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      const trimmed = options.searchTerm?.trim()
      if (trimmed) {
        query = query.or(
          `deal_full_name.ilike.%${trimmed}%,deal_email.ilike.%${trimmed}%,deal_phone.ilike.%${trimmed}%,deal_cpf.ilike.%${trimmed}%`,
        )
      }

      if (options.dateRange?.start) {
        query = query.gte('created_at', options.dateRange.start)
      }

      if (options.dateRange?.end) {
        query = query.lte('created_at', options.dateRange.end)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('Failed to load deals', fetchError)
        setError('Não foi possível carregar os negócios.')
        setDeals([])
      } else {
        setDeals((data ?? []) as DealRecord[])
      }

      setIsLoading(false)
    },
    [companyId, companyError, isCompanyLoading],
  )

  const updateLocalDeals = useCallback((newDeals: DealRecord[] | ((prev: DealRecord[]) => DealRecord[])) => {
    setDeals(newDeals)
  }, [])

  return {
    deals,
    isLoading,
    error,
    fetchDeals,
    setDeals: updateLocalDeals
  }
}
