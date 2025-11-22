import styles from '../deal-drawer.module.css'
import { formatCPF, formatPhone, formatRG } from '@/entities/deal/lib/format'
import type { DealRecord } from '@/entities/deal/model'

type PersonalInfoProps = {
  form: Partial<DealRecord>
  onChange: (key: keyof DealRecord, value: string | number | null) => void
}

const toDateInputValue = (value: string | null | undefined) => {
  if (!value) return ''
  return value.slice(0, 10)
}

export const PersonalInfo = ({ form, onChange }: PersonalInfoProps) => {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Dados pessoais</h3>
      <div className={styles.gridTwo}>
        <label className={styles.field}>
          <span>Nome</span>
          <input
            value={form.deal_full_name ?? ''}
            onChange={(event) => onChange('deal_full_name', event.target.value)}
            placeholder="Nome completo"
          />
        </label>
        <label className={styles.field}>
          <span>CPF</span>
          <input
            value={form.deal_cpf ?? ''}
            onChange={(event) => onChange('deal_cpf', formatCPF(event.target.value))}
            placeholder="000.000.000-00"
          />
        </label>
        <label className={styles.field}>
          <span>Data de nascimento</span>
          <input
            type="date"
            value={toDateInputValue(form.data_nascimento ?? null)}
            onChange={(event) => onChange('data_nascimento', event.target.value || null)}
          />
        </label>
        <label className={styles.field}>
          <span>RG</span>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={form.deal_rg ?? ''}
            onChange={(event) => onChange('deal_rg', formatRG(event.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>Telefone</span>
          <input
            value={form.deal_phone ?? ''}
            onChange={(event) => onChange('deal_phone', formatPhone(event.target.value))}
            placeholder="(00) 00000-0000"
          />
        </label>
        <label className={styles.field}>
          <span>Email</span>
          <input
            type="email"
            value={form.deal_email ?? ''}
            onChange={(event) => onChange('deal_email', event.target.value)}
          />
        </label>
      </div>
    </section>
  )
}
