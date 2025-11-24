import { useCallback, useEffect, useRef, useState } from 'react'

import { env } from '@/config/env'
import { supabase } from '@/lib/supabase-client'
import type { CpfConsultationPayload, CpfConsultationResult } from '@/features/cpf/types'

const sanitizeCpf = (value: string) => value.replace(/\D/g, '')

const STORAGE_PREFIX = 'crm-heart:cpf-consultation'
const RESULT_STORAGE_KEY = `${STORAGE_PREFIX}:result`
const ERROR_STORAGE_KEY = `${STORAGE_PREFIX}:error`

const isBrowser = typeof window !== 'undefined'

const loadStoredResult = (): CpfConsultationResult | null => {
  if (!isBrowser) return null
  const raw = window.sessionStorage.getItem(RESULT_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CpfConsultationResult
  } catch (error) {
    console.warn('Failed to parse stored CPF consultation result', error)
    window.sessionStorage.removeItem(RESULT_STORAGE_KEY)
    return null
  }
}

const persistResult = (value: CpfConsultationResult | null) => {
  if (!isBrowser) return
  if (!value) {
    window.sessionStorage.removeItem(RESULT_STORAGE_KEY)
    return
  }
  window.sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(value))
}

const loadStoredError = (): string | null => {
  if (!isBrowser) return null
  return window.sessionStorage.getItem(ERROR_STORAGE_KEY)
}

const persistError = (value: string | null) => {
  if (!isBrowser) return
  if (!value) {
    window.sessionStorage.removeItem(ERROR_STORAGE_KEY)
    return
  }
  window.sessionStorage.setItem(ERROR_STORAGE_KEY, value)
}

export const useCpfConsultation = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResultState] = useState<CpfConsultationResult | null>(() => loadStoredResult())
  const [error, setErrorState] = useState<string | null>(() => loadStoredError())
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const setResult = useCallback((value: CpfConsultationResult | null) => {
    persistResult(value)
    if (isMountedRef.current) {
      setResultState(value)
    }
  }, [])

  const setError = useCallback((value: string | null) => {
    persistError(value)
    if (isMountedRef.current) {
      setErrorState(value)
    }
  }, [])

  const consult = useCallback(
    async (payload: CpfConsultationPayload) => {
      if (isMountedRef.current) {
        setIsLoading(true)
      }
      setError(null)

      const cpf = sanitizeCpf(payload.cpf)
      const apiBaseUrl = env.apiUrl?.trim()

      if (!apiBaseUrl) {
        setError('Backend API URL não configurada. Informe VITE_API_URL.')
        if (isMountedRef.current) {
          setIsLoading(false)
        }
        return
      }

      const token = await supabase.auth
        .getSession()
        .then(({ data }) => data.session?.access_token)
        .catch(() => null)

      if (!token) {
        setError('Sessão expirada. Faça login novamente.')
        if (isMountedRef.current) {
          setIsLoading(false)
        }
        return
      }

      const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/cpf/consult`

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cpf }),
        })

        if (!response.ok) {
          const payloadText = await response.text().catch(() => null)
          const errorMessage = payloadText && payloadText.trim().length > 0 ? payloadText : null
          setError(errorMessage ?? `Não foi possível consultar o CPF. Código ${response.status}.`)
          if (isMountedRef.current) {
            setIsLoading(false)
          }
          return
        }

        const data = (await response.json().catch(() => null)) as
          | { success?: boolean; result?: CpfConsultationResult }
          | CpfConsultationResult
          | null
        const result =
          (data && 'result' in data ? (data.result as CpfConsultationResult | null) : (data as CpfConsultationResult | null)) ??
          null

        if (!result) {
          setError('Resposta inválida do serviço de CPF.')
          if (isMountedRef.current) {
            setIsLoading(false)
          }
          return
        }

        if (result.status === 'error') {
          setError(result.message ?? 'Não foi possível consultar o CPF. Tente novamente.')
        }

        setResult(result)
      } catch (error) {
        console.error('Failed to execute CPF consultation', error)
        setError('Erro de rede ao consultar o CPF. Tente novamente.')
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      }
    },
    [setError, setResult],
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    if (isMountedRef.current) {
      setIsLoading(false)
    }
  }, [setError, setResult])

  return { isLoading, result, error, consult, reset }
}
