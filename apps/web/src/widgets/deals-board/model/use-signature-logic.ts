import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { DealRecord } from '@/entities/deal/model'
import { formatPhone, formatCPF } from '@/entities/deal/lib/format'

export type SignerDeliveryMethod = 'email' | 'whatsapp' | 'sms'
export type SignerRole = 'SIGNER' | 'WITNESS'
export type SignatureFieldType = 'SIGNATURE' | 'NAME' | 'INITIALS' | 'DATE' | 'CPF'

export type SignatureField = {
  id: string
  type: SignatureFieldType
  page: number
  xPercent: number
  yPercent: number
  x: number
  y: number
  pageTop: number
  pageHeight: number
  pageWidth: number
  pageLeft: number
}

export type SignerFormEntry = {
  id: string
  name: string
  email: string
  phone: string
  cpf: string
  deliveryMethod: SignerDeliveryMethod
  role: SignerRole
  fields: SignatureField[]
}

export type ParticipantColor = {
  border: string
  background: string
  badgeBackground: string
  badgeColor: string
  shadow: string
}

export const DELIVERY_METHOD_OPTIONS: Array<{ value: SignerDeliveryMethod; label: string }> = [
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
]

const SIGNER_COLOR_PALETTE: ParticipantColor[] = [
  {
    border: 'rgba(37, 99, 235, 0.55)',
    background: 'rgba(59, 130, 246, 0.12)',
    badgeBackground: 'rgba(37, 99, 235, 0.18)',
    badgeColor: '#1d4ed8',
    shadow: '0 16px 32px -24px rgba(37, 99, 235, 0.65)',
  },
  {
    border: 'rgba(99, 102, 241, 0.55)',
    background: 'rgba(129, 140, 248, 0.12)',
    badgeBackground: 'rgba(99, 102, 241, 0.18)',
    badgeColor: '#4c1d95',
    shadow: '0 16px 32px -24px rgba(99, 102, 241, 0.55)',
  },
  {
    border: 'rgba(5, 150, 105, 0.55)',
    background: 'rgba(16, 185, 129, 0.12)',
    badgeBackground: 'rgba(5, 150, 105, 0.18)',
    badgeColor: '#047857',
    shadow: '0 16px 32px -24px rgba(5, 150, 105, 0.6)',
  },
  {
    border: 'rgba(56, 189, 248, 0.55)',
    background: 'rgba(125, 211, 252, 0.17)',
    badgeBackground: 'rgba(56, 189, 248, 0.22)',
    badgeColor: '#0c4a6e',
    shadow: '0 16px 32px -24px rgba(56, 189, 248, 0.5)',
  },
]

const WITNESS_COLOR_PALETTE: ParticipantColor[] = [
  {
    border: 'rgba(249, 115, 22, 0.6)',
    background: 'rgba(251, 146, 60, 0.15)',
    badgeBackground: 'rgba(251, 146, 60, 0.24)',
    badgeColor: '#c2410c',
    shadow: '0 16px 32px -24px rgba(249, 115, 22, 0.6)',
  },
  {
    border: 'rgba(234, 88, 12, 0.6)',
    background: 'rgba(249, 115, 22, 0.11)',
    badgeBackground: 'rgba(234, 88, 12, 0.22)',
    badgeColor: '#9a3412',
    shadow: '0 16px 32px -24px rgba(234, 88, 12, 0.55)',
  },
  {
    border: 'rgba(245, 158, 11, 0.6)',
    background: 'rgba(253, 186, 116, 0.16)',
    badgeBackground: 'rgba(245, 158, 11, 0.24)',
    badgeColor: '#92400e',
    shadow: '0 16px 32px -24px rgba(245, 158, 11, 0.55)',
  },
  {
    border: 'rgba(217, 70, 239, 0.6)',
    background: 'rgba(232, 121, 249, 0.15)',
    badgeBackground: 'rgba(217, 70, 239, 0.22)',
    badgeColor: '#a21caf',
    shadow: '0 16px 32px -24px rgba(217, 70, 239, 0.6)',
  },
]

const createSignerFromDeal = (deal: Partial<DealRecord> & { id?: string }): SignerFormEntry => ({
  id: crypto.randomUUID(),
  name: deal.deal_full_name ?? '',
  email: deal.deal_email ?? '',
  phone: deal.deal_phone ?? '',
  cpf: deal.deal_cpf ?? '',
  deliveryMethod: 'email',
  role: 'SIGNER',
  fields: [],
})

const createEmptySigner = (role: SignerRole = 'SIGNER'): SignerFormEntry => ({
  id: crypto.randomUUID(),
  name: '',
  email: '',
  phone: '',
  cpf: '',
  deliveryMethod: 'email',
  role,
  fields: [],
})

export const useSignatureLogic = (deal: (Partial<DealRecord> & { id: string }) | null) => {
  const [signers, setSigners] = useState<SignerFormEntry[]>([])
  const [signersOrdered, setSignersOrdered] = useState(false)
  const [activeSignerId, setActiveSignerId] = useState<string | null>(null)
  const [isDesignerOpen, setIsDesignerOpen] = useState(false)

  const handleAddSigner = () => {
    const newSigner = createEmptySigner('SIGNER')
    setSigners((prev) => [...prev, newSigner])
    setActiveSignerId(newSigner.id)
  }

  const handleAddWitness = () => {
    const newWitness = createEmptySigner('WITNESS')
    setSigners((prev) => [...prev, newWitness])
    setActiveSignerId(newWitness.id)
  }

  const handleRemoveSigner = (id: string) => {
    setSigners((prev) => {
      const filtered = prev.filter((signer) => signer.id !== id)
      if (filtered.length === 0) {
        const fallback = createEmptySigner('SIGNER')
        setActiveSignerId(fallback.id)
        return [fallback]
      }

      if (activeSignerId === id) {
        setActiveSignerId(filtered[0]?.id ?? null)
      }

      return filtered
    })
  }

  const handleSignerChange = (id: string, patch: Partial<Omit<SignerFormEntry, 'id' | 'fields'>>) => {
    setSigners((prev) =>
      prev.map((signer) => {
        if (signer.id !== id) return signer

        const updated: SignerFormEntry = { ...signer, ...patch }

        if (patch.deliveryMethod) {
          if (patch.deliveryMethod === 'email') {
            updated.phone = ''
          } else if (patch.deliveryMethod === 'sms' || patch.deliveryMethod === 'whatsapp') {
            updated.email = ''
          }
        }

        return updated
      }),
    )
  }

  const handleSignerCpfChange = (id: string, value: string) => {
    const normalized = value.replace(/[^0-9]/g, '').slice(0, 11)
    setSigners((prev) =>
      prev.map((signer) => (signer.id === id ? { ...signer, cpf: normalized } : signer)),
    )
  }

  const handleSignerSelect = (id: string) => {
    setActiveSignerId(id)
  }

  useEffect(() => {
    if (!deal) return

    setSigners((prev) => {
      if (prev.length > 0) return prev
      const fallback = createSignerFromDeal(deal)
      setActiveSignerId(fallback.id)
      return [fallback]
    })
  }, [deal])

  useEffect(() => {
    if (!signers.length) {
      setActiveSignerId(null)
      return
    }

    if (!activeSignerId || !signers.some((signer) => signer.id === activeSignerId)) {
      setActiveSignerId(signers[0]?.id ?? null)
    }
  }, [signers, activeSignerId])

  const participantCounts = useMemo(() => {
    let signerTotal = 0
    let witnessTotal = 0
    for (const signer of signers) {
      if (signer.role === 'WITNESS') {
        witnessTotal += 1
      } else {
        signerTotal += 1
      }
    }
    return { signerTotal, witnessTotal }
  }, [signers])

  const participantMetadata = useMemo(() => {
    let signerCounter = 0
    let witnessCounter = 0
    const map = new Map<
      string,
      {
        displayLabel: string
        color: ParticipantColor
        role: SignerRole
        index: number
        deliveryMethod: SignerDeliveryMethod
      }
    >()

    for (const participant of signers) {
      const isWitness = participant.role === 'WITNESS'
      const index = isWitness ? ++witnessCounter : ++signerCounter
      const palette = isWitness ? WITNESS_COLOR_PALETTE : SIGNER_COLOR_PALETTE
      const color = palette[(index - 1) % palette.length]
      const displayLabel = isWitness ? `Testemunha ${index}` : `Signatário ${index}`
      map.set(participant.id, {
        displayLabel,
        color,
        role: participant.role,
        index,
        deliveryMethod: participant.deliveryMethod,
      })
    }

    return map
  }, [signers])

  const activeSigner = useMemo(() => {
    if (!signers.length) return null
    return signers.find((signer) => signer.id === activeSignerId) ?? signers[0]
  }, [signers, activeSignerId])

  return {
    signers,
    setSigners,
    signersOrdered,
    setSignersOrdered,
    activeSignerId,
    setActiveSignerId,
    isDesignerOpen,
    setIsDesignerOpen,
    handleAddSigner,
    handleAddWitness,
    handleRemoveSigner,
    handleSignerChange,
    handleSignerCpfChange,
    handleSignerSelect,
    participantCounts,
    participantMetadata,
    activeSigner
  }
}
