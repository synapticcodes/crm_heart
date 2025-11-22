import styles from '../deal-drawer.module.css'
import { formatCurrency, parseCurrency } from '@/entities/deal/lib/format'
import type { DealRecord, ServiceRecord } from '@/entities/deal/model'

type FinancialInfoProps = {
  form: Partial<DealRecord>
  services: ServiceRecord[]
  parcelValue: number | null
  onChange: (key: keyof DealRecord, value: string | number | null) => void
  onServiceChange: (serviceName: string) => void
}

const SERVICE_FALLBACK: ServiceRecord = {
  id: 'custom',
  nome: 'Outro serviço',
}

const toDateInputValue = (value: string | null | undefined) => {
  if (!value) return ''
  return value.slice(0, 10)
}

export const FinancialInfo = ({
  form,
  services,
  parcelValue,
  onChange,
  onServiceChange,
}: FinancialInfoProps) => {
  const selectedService = services.find((service) => service.nome === form.deal_servico)
  const availablePaymentMethods = selectedService?.formas_pagamento ?? ['Pix', 'Cartão', 'Boleto']
  const maxInstallments = selectedService?.max_parcelas ?? 12

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Informações comerciais</h3>
      <div className={styles.gridTwo}>
        <label className={styles.field}>
          <span>Serviço</span>
          <select
            value={form.deal_servico ?? ''}
            onChange={(event) => onServiceChange(event.target.value)}
          >
            <option value="">Selecione um serviço</option>
            {[...services, SERVICE_FALLBACK].map((service) => (
              <option key={service.id} value={service.nome}>
                {service.nome}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Valor do contrato</span>
          <input
            value={
              form.deal_valor_contrato !== null && form.deal_valor_contrato !== undefined
                ? formatCurrency(parseCurrency(form.deal_valor_contrato ?? null))
                : ''
            }
            onChange={(event) => onChange('deal_valor_contrato', event.target.value)}
            onBlur={() => {
              const numeric = parseCurrency(form.deal_valor_contrato ?? null)
              onChange('deal_valor_contrato', numeric)
            }}
            placeholder="R$ 0,00"
          />
        </label>
      </div>
      <div className={styles.gridThree}>
        <label className={styles.field}>
          <span>Forma de pagamento</span>
          <select
            value={form.deal_forma_pagamento ?? ''}
            onChange={(event) => onChange('deal_forma_pagamento', event.target.value)}
          >
            <option value="">Selecione</option>
            {availablePaymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Parcelas</span>
          <input
            type="number"
            min={1}
            max={maxInstallments}
            value={form.deal_parcelas ?? ''}
            onChange={(event) => {
              const value = Number(event.target.value)
              onChange('deal_parcelas', Number.isNaN(value) ? null : value)
            }}
          />
        </label>
        <label className={styles.field}>
          <span>Valor parcela</span>
          <input value={parcelValue ? formatCurrency(parcelValue) : ''} readOnly />
        </label>
      </div>
      <div className={styles.gridTwo}>
        <label className={styles.field}>
          <span>Data primeira parcela</span>
          <input
            type="date"
            value={toDateInputValue(form.data_primeira_parcela)}
            onChange={(event) => onChange('data_primeira_parcela', event.target.value || null)}
          />
        </label>
      </div>
    </section>
  )
}
