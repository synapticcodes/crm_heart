import { useCallback, useEffect, useMemo, useState } from 'react'
import { addMonths, format as formatDate, isValid, parseISO } from 'date-fns'
import { useCompany } from '@/app/providers/use-company'
import { DealRecord, ServiceRecord } from '@/entities/deal/model'
import { parseCurrency } from '@/entities/deal/lib/format'
import { DEAL_DRAFT_STORAGE_PREFIX } from '@/features/deals/constants'

const normalizeDateString = (value: unknown): string | null => {
  if (!value) return null

  if (value instanceof Date) {
    if (!isValid(value)) return null
    return formatDate(value, 'yyyy-MM-dd')
  }

  if (typeof value === 'number') {
    const fromNumber = new Date(value)
    if (!Number.isNaN(fromNumber.getTime())) {
      return formatDate(fromNumber, 'yyyy-MM-dd')
    }
    return null
  }

  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  let parsed: Date | null = null
  try {
    parsed = parseISO(trimmed)
  } catch {
    parsed = null
  }

  if (!parsed || !isValid(parsed)) {
    const fallback = new Date(trimmed)
    if (!Number.isNaN(fallback.getTime())) {
      parsed = fallback
    }
  }

  if (!parsed || !isValid(parsed)) return null

  return formatDate(parsed, 'yyyy-MM-dd')
}

const normalizeParcelSchedule = (value: unknown): Record<string, string> | null => {
  if (!value) return null

  let entries: Record<string, unknown> | null = null

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        entries = parsed
      }
    } catch {
      entries = null
    }
  } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    entries = value as Record<string, unknown>
  }

  if (!entries) return null

  const result: Record<string, string> = {}

  Object.entries(entries).forEach(([key, rawValue]) => {
    if (!key.startsWith('deal_parcela_')) return
    const normalized = normalizeDateString(rawValue)
    if (normalized) {
      result[key] = normalized
    }
  })

  return Object.keys(result).length > 0 ? result : null
}

const generateParcelSchedule = (startDate: string | null | undefined, total: number | null | undefined) => {
  if (!startDate || !total || total <= 0) return null
  const normalizedStart = normalizeDateString(startDate)
  if (!normalizedStart) return null

  let base: Date
  try {
    base = parseISO(normalizedStart)
  } catch {
    base = new Date(normalizedStart)
  }

  if (!base || Number.isNaN(base.getTime())) return null

  const schedule: Record<string, string> = {}

  for (let index = 0; index < total; index += 1) {
    const future = addMonths(base, index)
    if (Number.isNaN(future.getTime())) continue
    schedule[`deal_parcela_${index + 1}`] = formatDate(future, 'yyyy-MM-dd')
  }

  return Object.keys(schedule).length ? schedule : null
}

const schedulesAreEqual = (
  current: Record<string, string> | null | undefined,
  next: Record<string, string> | null | undefined,
) => {
  if (!current && !next) return true
  if (!current || !next) return false
  const currentKeys = Object.keys(current)
  const nextKeys = Object.keys(next)
  if (currentKeys.length !== nextKeys.length) return false
  return currentKeys.every((key) => current[key] === next[key])
}

export const useDealFormLogic = (
  deal: (Partial<DealRecord> & { id: string }) | null,
  services: ServiceRecord[],
  onSave: (payload: Partial<DealRecord> & { id: string }) => Promise<void>,
  onClose: () => void
) => {
  const [form, setForm] = useState<Partial<DealRecord>>({})
  const [parcelValue, setParcelValue] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { companyId } = useCompany()
  const dealCompanyId = deal?.company_id ?? null
  const draftStorageKey = typeof window !== 'undefined' && deal ? `${DEAL_DRAFT_STORAGE_PREFIX}:${deal.id}` : null

  const normalizeFormState = useCallback(
    (payload: Partial<DealRecord>): Partial<DealRecord> => {
      const schedule = normalizeParcelSchedule(payload.parcelas_datas ?? null)
      const firstParcel = schedule?.deal_parcela_1 ?? null
      const firstDate = normalizeDateString(payload.data_primeira_parcela ?? firstParcel)
      const birthDate = normalizeDateString(payload.data_nascimento ?? null)

      return {
        ...payload,
        company_id: payload.company_id ?? dealCompanyId ?? companyId ?? null,
        data_primeira_parcela: firstDate,
        data_nascimento: birthDate,
        parcelas_datas: schedule,
      }
    },
    [companyId, dealCompanyId],
  )

  const handleChange = (key: keyof DealRecord, value: string | number | null) => {
    setForm((prev) => {
      let nextValue: string | number | null = value

      if (key === 'data_primeira_parcela' || key === 'data_nascimento') {
        nextValue = normalizeDateString(value) ?? null
      }

      return {
        ...prev,
        [key]: nextValue,
      }
    })
  }

  const handleServiceChange = (serviceName: string) => {
    const service = services.find((item) => item.nome === serviceName) ?? null
    const currentServiceName = form.deal_servico ?? ''
    const hasChanged = serviceName !== currentServiceName
    const defaultValue =
      service?.valor_padrao !== null && service?.valor_padrao !== undefined ? service.valor_padrao : null
    const defaultInstallments = service?.max_parcelas ?? null

    const shouldSetDefault =
      defaultValue !== null && (hasChanged || form.deal_valor_contrato === null || form.deal_valor_contrato === undefined)
    const shouldSetInstallments =
      defaultInstallments !== null &&
      defaultInstallments !== undefined &&
      (hasChanged || !form.deal_parcelas || form.deal_parcelas > defaultInstallments)

    setForm((prev) => {
      const next: Partial<DealRecord> = {
        ...prev,
        deal_servico: serviceName,
      }

      if (shouldSetDefault) {
        next.deal_valor_contrato = defaultValue
      } else if (!serviceName) {
        next.deal_valor_contrato = null
      }

      if (shouldSetInstallments) {
        next.deal_parcelas = defaultInstallments
      } else if (!serviceName) {
        next.deal_parcelas = null
      }

      return next
    })

    const nextInstallments = shouldSetInstallments
      ? defaultInstallments
      : service
        ? form.deal_parcelas ?? null
        : null

    if (!serviceName) {
      setParcelValue(null)
      return
    }

    if (nextInstallments && nextInstallments > 0) {
      const contractValue = shouldSetDefault ? defaultValue ?? 0 : parseCurrency(form.deal_valor_contrato ?? null)
      if (contractValue > 0) {
        setParcelValue(contractValue / nextInstallments)
      } else {
        setParcelValue(null)
      }
    }
  }

  const buildDealPersistPayload = useCallback(() => {
    if (!deal) return null

    const normalizedForm = normalizeFormState(form)
    const rawValue = normalizedForm.deal_valor_contrato ?? null
    const numericValue =
      rawValue !== null && rawValue !== undefined && rawValue !== ''
        ? parseCurrency(rawValue as string | number | null | undefined)
        : null

    return {
      id: deal.id,
      ...normalizedForm,
      deal_valor_contrato: numericValue,
    } as Partial<DealRecord> & { id: string }
  }, [deal, form, normalizeFormState])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!deal) return

    setIsSaving(true)
    setError(null)

    const payload = buildDealPersistPayload()
    if (!payload) {
      setIsSaving(false)
      setError('Não foi possível preparar os dados para salvar o negócio.')
      return
    }

    try {
      await onSave(payload)
      setForm(normalizeFormState(payload))
      if (draftStorageKey && typeof window !== 'undefined') {
        sessionStorage.removeItem(draftStorageKey)
      }
      onClose()
    } catch (error) {
      console.error(error)
      setError((error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (!deal) return

    setForm((prev) => {
      const schedule = generateParcelSchedule(form.data_primeira_parcela, form.deal_parcelas)

      if (!schedule) {
        if (!prev.parcelas_datas) return prev
        return {
          ...prev,
          parcelas_datas: null,
        }
      }

      if (schedulesAreEqual(prev.parcelas_datas, schedule)) {
        return prev
      }

      return {
        ...prev,
        parcelas_datas: schedule,
      }
    })
  }, [deal, form.data_primeira_parcela, form.deal_parcelas])

  // Initial Load
  useEffect(() => {
    if (!deal) return

    setForm(normalizeFormState(deal))

    if (deal.deal_valor_contrato && deal.deal_parcelas) {
      const value = parseCurrency(deal.deal_valor_contrato ?? null)
      if (deal.deal_parcelas > 0) {
        setParcelValue(value / deal.deal_parcelas)
      }
    } else {
      setParcelValue(null)
    }
  }, [deal, normalizeFormState])

  return {
    form,
    setForm,
    parcelValue,
    setParcelValue,
    isSaving,
    error,
    setError,
    handleChange,
    handleServiceChange,
    handleSubmit,
    normalizeFormState,
    buildDealPersistPayload
  }
}
