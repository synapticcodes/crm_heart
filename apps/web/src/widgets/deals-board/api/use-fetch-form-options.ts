import { useEffect, useState } from 'react'
import { heartSupabase } from '@/lib/supabase-client'
import { useCompany } from '@/app/providers/use-company'
import { BRAZILIAN_STATES, type ServiceRecord } from '@/entities/deal/model'

export const useFetchFormOptions = (dealEstado: string | null | undefined) => {
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [isLoadingCities, setIsLoadingCities] = useState(false)
  const { companyId } = useCompany()

  useEffect(() => {
    if (!companyId) return

    const fetchServices = async () => {
      let query = heartSupabase
        .from('services')
        .select('id, nome, valor_padrao, max_parcelas, formas_pagamento, company_id')
        .order('created_at', { ascending: false })

      query = query.or(`company_id.eq.${companyId},company_id.is.null`)

      const { data, error } = await query

      if (error) {
        console.warn('services table not available or error fetching services', error.message)
        setServices([])
        return
      }

      setServices((data ?? []) as ServiceRecord[])
    }

    void fetchServices()
  }, [companyId])

  useEffect(() => {
    if (!dealEstado) {
      setCityOptions([])
      return
    }

    let active = true
    setIsLoadingCities(true)

    const fetchCities = async () => {
      const { data, error: fetchError } = await heartSupabase
        .from('cidades')
        .select('nome')
        .eq('estado', dealEstado)
        .order('nome')

      if (!active) return

      if (fetchError) {
        console.error('Failed to load cities', fetchError)
        setCityOptions([])
      } else {
        const names = (data ?? []).map((city) => city.nome as string)
        setCityOptions(names)
      }
      setIsLoadingCities(false)
    }

    void fetchCities()

    return () => {
      active = false
    }
  }, [dealEstado])

  return { services, cityOptions, isLoadingCities, stateOptions: BRAZILIAN_STATES }
}
