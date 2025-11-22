import type { CSSProperties } from 'react'
import { formatCPF, formatPhone } from '@/entities/deal/lib/format'
import {
  type SignerFormEntry,
  type SignerDeliveryMethod,
  DELIVERY_METHOD_OPTIONS,
  type ParticipantColor,
  type SignerRole
} from '@/widgets/deals-board/model/use-signature-logic'
import styles from '../deal-drawer.module.css'

type DesignerModalProps = {
  isOpen: boolean
  previewHtml: string | null
  previewTitle: string | null
  signers: SignerFormEntry[]
  activeSigner: SignerFormEntry | null
  signersOrdered: boolean
  participantMetadata: Map<string, {
    displayLabel: string
    color: ParticipantColor
    role: SignerRole
    index: number
    deliveryMethod: SignerDeliveryMethod
  }>
  isSending: boolean
  canSend: boolean
  onClose: () => void
  onSend: () => void
  onAddSigner: () => void
  onAddWitness: () => void
  onRemoveSigner: (id: string) => void
  onSelectSigner: (id: string) => void
  onToggleOrder: (ordered: boolean) => void
  onSignerChange: (id: string, patch: Partial<Omit<SignerFormEntry, 'id' | 'fields'>>) => void
  onSignerCpfChange: (id: string, value: string) => void
  previewRef: React.RefObject<HTMLDivElement>
  wrapperRef: React.RefObject<HTMLDivElement>
  documentRef: React.RefObject<HTMLDivElement>
}

export const DesignerModal = ({
  isOpen,
  previewHtml,
  previewTitle,
  signers,
  activeSigner,
  signersOrdered,
  participantMetadata,
  isSending,
  canSend,
  onClose,
  onSend,
  onAddSigner,
  onAddWitness,
  onRemoveSigner,
  onSelectSigner,
  onToggleOrder,
  onSignerChange,
  onSignerCpfChange,
  previewRef,
  wrapperRef,
  documentRef
}: DesignerModalProps) => {
  if (!isOpen || !previewHtml) return null

  return (
    <div className={styles.designerBackdrop} role="dialog" aria-modal="true">
      <div className={styles.designerContainer}>
        <aside className={styles.designerSidebar}>
          <header className={styles.designerSidebarHeader}>
            <div>
              <span className={styles.previewLabel}>Informe os participantes</span>
              <h4 className={styles.designerSidebarTitle}>Sem ordem ou com ordem definida</h4>
            </div>
            <button type="button" className={styles.designerCloseButton} onClick={onClose}>
              Fechar
            </button>
          </header>

          <div className={styles.designerOrderToggle}>
            <button
              type="button"
              className={`${styles.designerToggleButton} ${!signersOrdered ? styles.designerToggleButtonActive : ''}`}
              onClick={() => onToggleOrder(false)}
            >
              Sem ordem
            </button>
            <button
              type="button"
              className={`${styles.designerToggleButton} ${signersOrdered ? styles.designerToggleButtonActive : ''}`}
              onClick={() => onToggleOrder(true)}
            >
              Com ordem
            </button>
          </div>

          <button type="button" className={styles.addSignerButton} onClick={onAddSigner}>
            + Adicionar signatário
          </button>
          <button type="button" className={styles.addSignerButton} onClick={onAddWitness}>
            + Adicionar testemunha
          </button>

          <div className={styles.signersList}>
            {signers.map((signer) => {
              const meta = participantMetadata.get(signer.id)
              const displayLabel = meta?.displayLabel ?? 'Participante'
              const colorVars = meta?.color
                ? {
                    '--participant-border': meta.color.border,
                    '--participant-background': meta.color.background,
                    '--participant-badge-bg': meta.color.badgeBackground,
                    '--participant-badge-color': meta.color.badgeColor,
                    '--participant-shadow': meta.color.shadow,
                  }
                : undefined
              const isWitness = signer.role === 'WITNESS'

              return (
                <div
                  key={signer.id}
                  className={`${styles.signerCard} ${activeSigner?.id === signer.id ? styles.signerCardActive : ''}`}
                  onClick={() => onSelectSigner(signer.id)}
                  style={colorVars as CSSProperties}
                >
                  <div className={styles.signerCardHeader}>
                    <div className={styles.signerCardTitle}>
                      <span className={styles.signerIndex}>{displayLabel}</span>
                      <span
                        className={`${styles.signerRoleBadge} ${isWitness ? styles.signerRoleBadgeWitness : styles.signerRoleBadgeSigner}`}
                      >
                        {isWitness ? 'Testemunha' : 'Signatário'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.removeSignerButton}
                      onClick={(event) => {
                        event.stopPropagation()
                        onRemoveSigner(signer.id)
                      }}
                    >
                      Remover
                    </button>
                  </div>
                  <label className={styles.field}>
                    <span>Nome completo</span>
                    <input
                      value={signer.name}
                      onChange={(event) => onSignerChange(signer.id, { name: event.target.value })}
                    />
                  </label>
                  <label
                    className={`${styles.field} ${meta?.deliveryMethod === 'email' ? '' : styles.fieldHidden}`}
                  >
                    <span>Email</span>
                    <input
                      type="email"
                      value={signer.email}
                      onChange={(event) => onSignerChange(signer.id, { email: event.target.value })}
                      placeholder="participante@dominio.com"
                    />
                  </label>
                  <label
                    className={`${styles.field} ${meta?.deliveryMethod === 'sms' || meta?.deliveryMethod === 'whatsapp' ? '' : styles.fieldHidden}`}
                  >
                    <span>Telefone</span>
                    <input
                      value={formatPhone(signer.phone)}
                      onChange={(event) => onSignerChange(signer.id, { phone: formatPhone(event.target.value) })}
                      placeholder="(00) 00000-0000"
                    />
                  </label>
                  <label className={styles.field}>
                    <span>CPF</span>
                    <input
                      value={formatCPF(signer.cpf)}
                      onChange={(event) => onSignerCpfChange(signer.id, event.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Método de envio</span>
                    <select
                      value={signer.deliveryMethod}
                      onChange={(event) => onSignerChange(signer.id, {
                        deliveryMethod: event.target.value as SignerDeliveryMethod,
                      })}
                    >
                      {DELIVERY_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )
            })}
          </div>
        </aside>

        <div className={styles.designerPreviewColumn}>
          <header className={styles.designerPreviewHeader}>
            <div>
              <span className={styles.previewLabel}>Pré-visualização</span>
              <h4 className={styles.previewTitle}>{previewTitle ?? 'Contrato'}</h4>
            </div>
            <button type="button" className={styles.designerCloseButton} onClick={onClose}>
              Fechar
            </button>
          </header>
          <div className={styles.designerPreviewSurface} ref={previewRef}>
            <div className={styles.designerPreviewDocumentWrapper} ref={wrapperRef}>
              <div
                className={styles.designerPreviewDocument}
                ref={documentRef}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>

          <div className={styles.designerFooter}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onSend}
              disabled={isSending || !canSend}
            >
              {isSending ? 'Enviando...' : 'Enviar Contrato'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
