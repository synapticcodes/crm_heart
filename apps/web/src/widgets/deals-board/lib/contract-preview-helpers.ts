export const CONTRACT_PREVIEW_UNAUTHORIZED_ERROR = 'contract-preview/unauthorized'
const MARKER_REGEX = /\[\[__CRM_VAR_OPEN__([^\]]+)__\]\]([\s\S]*?)\[\[__CRM_VAR_CLOSE__\1__\]\]/g
const HIGHLIGHT_CLASS = 'crm-highlighted-value'
const HIGHLIGHT_MISSING_CLASS = 'crm-highlighted-value crm-highlighted-value--missing'
const MISSING_PLACEHOLDER = 'Não informado'

import { format as formatDate, isValid } from 'date-fns'
import type { ContractTemplateWithVariables } from '@/entities/contract/model'
import { formatCurrency, parseCurrency } from '@/entities/deal/lib/format'
import { supabase } from '@/lib/supabase-client'
import {
  fixFragmentedPlaceholdersInXml,
  replaceDocxPlaceholders,
} from '@/entities/deal/lib/docx-placeholders'

export const normalizeVariableKey = (value: string | null | undefined) => {
  if (!value) return ''
  return value.replace(/^{{\s*/g, '').replace(/\s*}}$/g, '').trim()
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const createHighlightSpan = (entry: { value: string; isMissing: boolean } | undefined, key: string) => {
  if (!entry) return ''
  const safeContent = escapeHtml(entry.value)
  const className = entry.isMissing ? HIGHLIGHT_MISSING_CLASS : HIGHLIGHT_CLASS
  return `<span class="${className}" data-variable="${key}">${safeContent}</span>`
}

export const resolveVariableValue = (
  variable: ContractTemplateWithVariables['variables'][number],
  fallbackKey: string,
  form: Record<string, unknown>,
  leadData: Record<string, unknown> | null
): string => {
  const column = variable.column_name ?? fallbackKey

  if (variable.source === 'deal') {
    const dealValue = form?.[column]
    if (dealValue === null || dealValue === undefined) return ''
    return typeof dealValue === 'string' ? dealValue : String(dealValue)
  }

  if (variable.source === 'lead') {
    const leadValue = leadData ? (leadData[column] as unknown) : undefined
    if (leadValue === null || leadValue === undefined) return ''
    return typeof leadValue === 'string' ? leadValue : String(leadValue)
  }

  if (variable.source === 'custom') {
    return variable.column_name ?? ''
  }

  return ''
}

export const buildTemplatePlainString = (
  template: ContractTemplateWithVariables,
  highlights: Record<string, { value: string; isMissing: boolean }>
) => {
  if (!template.template_body) return ''

  return template.template_body.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const normalizedKey = normalizeVariableKey(`{{${key}}}`)
    const entry = highlights[normalizedKey]
    if (!entry) return ''
    return entry.value
  })
}

export const applyHighlightsToHtml = (
  html: string,
  highlights: Record<string, { value: string; isMissing: boolean }>
) => {
  if (!html) return html

  try {
    const highlightedByMarkers = new Set<string>()
    let markersReplaced = false
    const initialHtml = html.replace(MARKER_REGEX, (_match, encodedKey, markerContent) => {
      let key = String(encodedKey)
      try {
        key = decodeURIComponent(String(encodedKey))
      } catch {
        key = String(encodedKey)
      }

      const entry = highlights[key]
      if (!entry) {
        return markerContent
      }

      highlightedByMarkers.add(key)
      markersReplaced = true
      return createHighlightSpan(entry, key)
    })

    const parser = new DOMParser()
    const parsed = parser.parseFromString(initialHtml, 'text/html')
    const entries = Object.entries(highlights).filter(([, entry]) => entry.value && entry.value.trim())

    if (!markersReplaced) {
      for (const [key, entry] of entries) {
        const alreadyHighlighted = highlightedByMarkers.has(key)
        if (alreadyHighlighted) {
          continue
        }

        const placeholderRegex = new RegExp(`{{\\s*${escapeRegex(key)}\\s*}}`, 'gi')
        if (placeholderRegex.test(parsed.body.innerHTML)) {
          parsed.body.innerHTML = parsed.body.innerHTML.replace(placeholderRegex, createHighlightSpan(entry, key))
          continue
        }

        const walker = parsed.createTreeWalker(parsed.body, NodeFilter.SHOW_TEXT)
        let node: Node | null = walker.nextNode()
        while (node) {
          const textNode = node as Text
          if (textNode.parentElement && textNode.parentElement.classList.contains(HIGHLIGHT_CLASS)) {
            node = walker.nextNode()
            continue
          }
          if (
            textNode.parentElement &&
            textNode.parentElement.classList.contains('crm-highlighted-value--missing')
          ) {
            node = walker.nextNode()
            continue
          }

          const content = textNode.nodeValue ?? ''
          const index = content.indexOf(entry.value)
          if (index !== -1) {
            const range = parsed.createRange()
            range.setStart(textNode, index)
            range.setEnd(textNode, index + entry.value.length)
            const span = parsed.createElement('span')
            span.className = entry.isMissing ? HIGHLIGHT_MISSING_CLASS : HIGHLIGHT_CLASS
            span.setAttribute('data-variable', key)
            span.textContent = entry.value
            range.deleteContents()
            range.insertNode(span)
            break
          }
          node = walker.nextNode()
        }
      }
    }

    return parsed.body.innerHTML
  } catch (error) {
    console.warn('Não foi possível destacar variáveis no HTML renderizado', error)
    return html
  }
}

const parseCurrencyLocal = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return null
    if (typeof value === 'number') return value
    return parseCurrency(value)
}

const formatParcelDisplay = (value: unknown): string => {
  if (!value) return ''

  if (value instanceof Date) {
    if (!isValid(value)) return ''
    return formatDate(value, 'dd/MM/yyyy')
  }

  if (typeof value === 'number') {
    const fromNumber = new Date(value)
    if (Number.isNaN(fromNumber.getTime())) return ''
    return formatDate(fromNumber, 'dd/MM/yyyy')
  }

  if (typeof value !== 'string') return ''

  const trimmed = value.trim()
  if (!trimmed) return ''

  const isoMatch = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(trimmed)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    const dateValue = new Date(Number(year), Number(month) - 1, Number(day))
    if (Number.isNaN(dateValue.getTime())) return ''
    return formatDate(dateValue, 'dd/MM/yyyy')
  }

  const fallback = new Date(trimmed)
  if (Number.isNaN(fallback.getTime())) return ''
  return formatDate(fallback, 'dd/MM/yyyy')
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
      // Assuming normalizeDateString is available or duplicated here if needed,
      // but for helper brevity let's assume simple string or handled by caller
      // Re-implementing simple normalization to be safe
      const valStr = String(rawValue)
      if (valStr) {
        result[key] = valStr
      }
    })

    return Object.keys(result).length > 0 ? result : null
  }

export const resolveTemplateVariables = (
  template: ContractTemplateWithVariables,
  form: Partial<Record<string, unknown>>,
  leadData: Record<string, unknown> | null
) => {
  const flatValues: Record<string, string> = {}
  const dealValues: Record<string, string> = {}
  const leadValues: Record<string, string> = {}
  const highlightValues: Record<string, { value: string; isMissing: boolean }> = {}
  const replacementValues: Record<string, string> = {}

  const normalizeKey = (value: string) => normalizeVariableKey(value.includes('{{') ? value : `{{${value}}}`)

  const setValue = (
    key: string,
    raw: unknown,
    options: { source?: 'deal' | 'lead'; column?: string | null } = {},
  ) => {
    const normalizedKey = normalizeKey(key)
    if (!normalizedKey) return

    let formatted = ''

    if (raw !== null && raw !== undefined && raw !== '') {
      if (normalizedKey === 'deal_valor_contrato' || normalizedKey === 'valor_parcela') {
        const numeric = typeof raw === 'number' ? raw : parseCurrencyLocal(typeof raw === 'string' ? raw : '')
        formatted = numeric ? formatCurrency(numeric) : ''
      } else if (/^deal_parcela_\d+$/.test(normalizedKey)) {
        formatted = formatParcelDisplay(raw)
      } else if (typeof raw === 'number') {
        formatted = Number.isFinite(raw) ? String(raw) : ''
      } else if (typeof raw === 'string') {
        formatted = raw
      } else if (raw instanceof Date) {
        formatted = raw.toISOString()
      }
    }

    const safeValue = formatted ?? ''
    const trimmed = safeValue.trim()
    const hasValue = Boolean(trimmed)
    const displayValue = hasValue ? safeValue : MISSING_PLACEHOLDER
    const isMissing = !hasValue

    flatValues[normalizedKey] = displayValue
    replacementValues[normalizedKey] = safeValue
    highlightValues[normalizedKey] = {
      value: displayValue,
      isMissing,
    }

    if (options.source === 'deal') {
      const columnKey = options.column ?? normalizedKey
      dealValues[columnKey] = displayValue
      const aliasKey = normalizeKey(`{{deal.${columnKey}}}`)
      replacementValues[aliasKey] = safeValue
    }

    if (options.source === 'lead') {
      const columnKey = options.column ?? normalizedKey
      leadValues[columnKey] = displayValue
      const aliasKey = normalizeKey(`{{lead.${columnKey}}}`)
      replacementValues[aliasKey] = safeValue
    }
  }

  const ensureDealEntries = () => {
    if (!form) return

    Object.entries(form).forEach(([key, value]) => {
      if (!key.startsWith('deal_') && key !== 'parcelas_datas') return

      if (key === 'parcelas_datas') {
        if (!value) return
        const parsed = normalizeParcelSchedule(value)
        if (!parsed) return
        Object.entries(parsed).forEach(([parcelKey, parcelValue]) => {
          if (parcelKey.startsWith('deal_parcela_')) {
            setValue(parcelKey, parcelValue, { source: 'deal', column: parcelKey })
          }
        })
        return
      }

      setValue(key, value, { source: 'deal', column: key })
    })
  }

  const ensureLeadEntries = () => {
    if (!leadData) return

    Object.entries(leadData).forEach(([key, value]) => {
      if (!key.startsWith('lead_')) return
      setValue(key, value, { source: 'lead', column: key })
    })
  }

  ensureDealEntries()
  ensureLeadEntries()

  template.variables.forEach((variable) => {
    const normalizedKey = normalizeKey(variable.variable_key)
    if (!normalizedKey) return

    if (highlightValues[normalizedKey]) return

    const rawValue = resolveVariableValue(variable, normalizedKey, form, leadData)
    if (variable.source === 'deal') {
      setValue(normalizedKey, rawValue, { source: 'deal', column: variable.column_name ?? normalizedKey })
      return
    }

    if (variable.source === 'lead') {
      setValue(normalizedKey, rawValue, { source: 'lead', column: variable.column_name ?? normalizedKey })
      return
    }

    setValue(normalizedKey, rawValue)
  })

  return {
    docxData: {
      ...flatValues,
      deal: dealValues,
      lead: leadValues,
    },
    highlightValues,
    replacementValues,
  }
}

const buildDocxReplacementDictionary = (data: Record<string, unknown>): Record<string, string> => {
    const result: Record<string, string> = {}

    const visit = (value: unknown, path: string) => {
      if (value === null || value === undefined) {
        result[path] = ''
        return
      }

      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
          const nextPath = path ? `${path}.${key}` : key
          visit(nested, nextPath)
        })
        return
      }

      result[path] = String(value)
    }

    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        visit(value, key)
        return
      }

      result[key] = value === null || value === undefined ? '' : String(value)
    })

    return result
  }

export const generateDocxPreviewHtml = async (
  templateId: string,
  dataMap: Record<string, unknown>,
  highlights: Record<string, { value: string; isMissing: boolean }>
) => {
  if (!templateId || typeof window === 'undefined') return null

  const invokeSignedUrl = () =>
    supabase.functions.invoke<{
      signedUrl?: string
    }>('contract-template-download-url', {
      body: { templateId },
    })

  const resolveSignedUrl = async () => {
    let { data, error } = await invokeSignedUrl()

    if (!error && data?.signedUrl) {
      return data.signedUrl
    }

    const initialStatus = (error as { status?: number } | null)?.status ?? null

    if (initialStatus === 401) {
      const { error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError) {
        console.warn('Falha ao atualizar sessão antes de gerar URL assinada para template', {
          templateId,
          refreshError,
        })
        throw new Error(CONTRACT_PREVIEW_UNAUTHORIZED_ERROR)
      }

      ;({ data, error } = await invokeSignedUrl())

      if (!error && data?.signedUrl) {
        return data.signedUrl
      }

      const retryStatus = (error as { status?: number } | null)?.status ?? null
      if (retryStatus === 401) {
        throw new Error(CONTRACT_PREVIEW_UNAUTHORIZED_ERROR)
      }
    }

    console.warn('Falha ao gerar URL assinada para template', { templateId, signedUrlError: error })
    return null
  }

  try {
    const signedUrl = await resolveSignedUrl()

    if (!signedUrl) {
      return null
    }

    const response = await fetch(signedUrl)
    if (!response.ok) {
      console.warn('Falha ao baixar DOCX com URL assinada', { templateId, status: response.status })
      return null
    }

    const arrayBuffer = await response.arrayBuffer()

    const [{ default: PizZip }, { renderAsync }] = await Promise.all([
      import('pizzip'),
      import('docx-preview'),
    ])

    let processedBuffer = arrayBuffer

    try {
      const sourceZip = new PizZip(arrayBuffer)
      const fixedZip = new PizZip()
      const replacementDictionary = buildDocxReplacementDictionary(dataMap)

      const allFiles = sourceZip.file(/.*/)

      for (const file of allFiles) {
        const fileName = file.name

        if (/word\/(document|header\d*|footer\d*)\.xml/.test(fileName)) {
          const xmlContent = file.asText()
          const fixedXml = fixFragmentedPlaceholdersInXml(xmlContent)
          const replacedXml = replaceDocxPlaceholders(fixedXml, replacementDictionary)
          fixedZip.file(fileName, replacedXml)
        } else {
          fixedZip.file(fileName, file.asUint8Array())
        }
      }

      processedBuffer = fixedZip.generate({
        type: 'arraybuffer',
      }) as ArrayBuffer
    } catch (processingError) {
      console.warn('Falha ao preparar DOCX para substituição de variáveis.', processingError)
    }

    const container = document.createElement('div')

    await renderAsync(processedBuffer, container, undefined, {
      inWrapper: false,
      ignoreLastRenderedPageBreak: true,
    })

    const highlightedHtml = applyHighlightsToHtml(container.innerHTML, highlights)
    container.remove()
    return highlightedHtml
  } catch (error) {
    if (error instanceof Error && error.message === CONTRACT_PREVIEW_UNAUTHORIZED_ERROR) {
      throw error
    }
    console.warn('Falha ao gerar pré-visualização DOCX', error)
    return null
  }
}

export const convertPreviewToHtml = (content: string | null) => {
  if (!content) return ''

  const trimmed = content.trim()
  if (!trimmed) return ''

  const containsHtmlTags = /<\/?[a-z][\s\S]*>/i.test(trimmed)
  if (containsHtmlTags) {
    return trimmed
  }

  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((paragraph) => {
      const safe = escapeHtml(paragraph).replace(/\n/g, '<br />')
      return `<p>${safe}</p>`
    })

  if (paragraphs.length === 0) {
    return `<p>${escapeHtml(trimmed)}</p>`
  }

  return paragraphs.join('')
}
