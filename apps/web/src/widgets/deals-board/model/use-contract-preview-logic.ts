import { useCallback, useEffect, useState } from 'react'
import { supabase, heartSupabase } from '@/lib/supabase-client'
import { ContractTemplateWithVariables } from '@/entities/contract/model'
import { DealRecord } from '@/entities/deal/model'
import { useContractTemplates } from '@/entities/contract/lib/use-contract-templates'
import {
  normalizeVariableKey,
  resolveVariableValue,
  buildTemplatePlainString,
  applyHighlightsToHtml,
  resolveTemplateVariables,
  generateDocxPreviewHtml,
  convertPreviewToHtml,
  CONTRACT_PREVIEW_UNAUTHORIZED_ERROR
} from '@/widgets/deals-board/lib/contract-preview-helpers'

export const useContractPreviewLogic = (
  deal: Partial<DealRecord> | null,
  form: Partial<DealRecord>,
  leadData: Record<string, unknown> | null
) => {
  const { templates, isLoading: templatesLoading, error: templatesError } = useContractTemplates()
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [previewContent, setPreviewContent] = useState<{ raw: string; html: string } | null>(null)
  const [previewTitle, setPreviewTitle] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [contractStatus, setContractStatus] = useState<string | null>(null)
  const [contractRejectionReason, setContractRejectionReason] = useState<string | null>(null)

  const handleGeneratePreview = useCallback(
    async (options?: { openPreview?: boolean }): Promise<{ raw: string; html: string } | null> => {
      const template = templates.find((item) => item.id === selectedTemplateId)

      if (!template) {
        setPreviewError('Selecione um template para gerar o contrato.')
        return null
      }

      if (!template.template_body && !template.storage_path) {
        setPreviewError('O template selecionado não possui conteúdo de pré-visualização.')
        return null
      }

      setIsPreviewLoading(true)

      try {
        const { docxData, highlightValues } = resolveTemplateVariables(template, form, leadData)
        const plainTemplate = template.template_body
          ? buildTemplatePlainString(template, highlightValues)
          : ''
        let previewRaw = plainTemplate
        let html: string | null = null

        if (template.storage_path) {
          const docxHtml = await generateDocxPreviewHtml(template.id, docxData, highlightValues)
          if (docxHtml) {
            previewRaw = docxHtml
            html = docxHtml
          }
        }

        if (!html && plainTemplate) {
          const converted = convertPreviewToHtml(plainTemplate)
          if (converted) {
            html = applyHighlightsToHtml(converted, highlightValues)
            previewRaw = plainTemplate
          }
        }

        if (!html) {
          setPreviewContent(null)
          setPreviewTitle(template.nome)
          setPreviewError('Não encontramos conteúdo para gerar a pré-visualização.')
          return null
        }

        setPreviewTitle(template.nome)
        setPreviewContent({ raw: previewRaw, html })
        setPreviewError(null)
        if (options?.openPreview) {
          setIsPreviewModalOpen(true)
        }
        return { raw: previewRaw, html }
      } catch (error) {
        if (error instanceof Error && error.message === CONTRACT_PREVIEW_UNAUTHORIZED_ERROR) {
          setPreviewError('Sua sessão expirou. Faça login novamente.')
        } else {
          console.error(error)
          setPreviewError('Não foi possível gerar a pré-visualização do contrato.')
        }
        return null
      } finally {
        setIsPreviewLoading(false)
      }
    },
    [form, leadData, selectedTemplateId, templates],
  )

  return {
    templates,
    templatesLoading,
    templatesError,
    selectedTemplateId,
    setSelectedTemplateId,
    previewContent,
    setPreviewContent,
    previewTitle,
    setPreviewTitle,
    previewError,
    setPreviewError,
    isPreviewModalOpen,
    setIsPreviewModalOpen,
    isPreviewLoading,
    contractStatus,
    setContractStatus,
    contractRejectionReason,
    setContractRejectionReason,
    handleGeneratePreview
  }
}
