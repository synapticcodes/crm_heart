import styles from '../deal-drawer.module.css'
import { FileUploadField } from '@/shared/ui/file-upload/file-upload-field'
import type { DealRecord } from '@/entities/deal/model'

type DocumentsInfoProps = {
  dealId: string
  dealName: string
  dealCpf: string
  form: Partial<DealRecord>
  onChange: (key: keyof DealRecord, value: string | null) => void
}

export const DocumentsInfo = ({ dealId, dealName, dealCpf, form, onChange }: DocumentsInfoProps) => {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Documentos</h3>
      <div className={styles.gridTwo}>
        <FileUploadField
          bucket="arquivos_deals"
          dealId={dealId}
          dealName={dealName}
          dealCpf={dealCpf}
          label="Documento frente"
          fieldValue={form.deal_documento_frente ?? null}
          onUploaded={(path) => onChange('deal_documento_frente', path)}
          accept="image/*,application/pdf"
        />
        <FileUploadField
          bucket="arquivos_deals"
          dealId={dealId}
          dealName={dealName}
          dealCpf={dealCpf}
          label="Documento verso"
          fieldValue={form.deal_documento_verso ?? null}
          onUploaded={(path) => onChange('deal_documento_verso', path)}
          accept="image/*,application/pdf"
        />
        <FileUploadField
          bucket="arquivos_deals"
          dealId={dealId}
          dealName={dealName}
          dealCpf={dealCpf}
          label="Comprovante de residência"
          fieldValue={form.deal_comprovante_residencia ?? null}
          onUploaded={(path) => onChange('deal_comprovante_residencia', path)}
          accept="image/*,application/pdf"
        />
        <FileUploadField
          bucket="arquivos_deals"
          dealId={dealId}
          dealName={dealName}
          dealCpf={dealCpf}
          label="Cópia do contrato assinado"
          fieldValue={form.deal_copia_contrato_assinado ?? null}
          onUploaded={(path) => onChange('deal_copia_contrato_assinado', path)}
          accept="application/pdf,image/*"
        />
        <FileUploadField
          bucket="audios_deals"
          dealId={dealId}
          dealName={dealName}
          dealCpf={dealCpf}
          label="Áudio"
          fieldValue={form.deal_audio ?? null}
          onUploaded={(path) => onChange('deal_audio', path)}
          accept="audio/*"
        />
      </div>
    </section>
  )
}
