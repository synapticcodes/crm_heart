import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import type { SupabaseAuthUser } from '../../common/interfaces/auth-user.interface'
import { SupabaseService } from '../../common/supabase/supabase.service'
import { ProfileService } from '../profile/profile.service'
import { ConsultCpfDto } from './dto/consult-cpf.dto'

@Injectable()
export class CpfService {
  private readonly logger = new Logger(CpfService.name)
  private readonly prodWebhookUrl: string
  private readonly testWebhookUrl: string
  private readonly providerToken: string

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly profileService: ProfileService,
  ) {
    this.prodWebhookUrl =
      this.configService.get('CPF_WEBHOOK_PROD_URL') ??
      'https://autowebhook.meunomeok.uk/webhook/b466b2a8-0abc-419b-8603-011dc71e77cc'
    this.testWebhookUrl =
      this.configService.get('CPF_WEBHOOK_TEST_URL') ??
      'https://auto.meunomeok.uk/webhook-test/b466b2a8-0abc-419b-8603-011dc71e77cc'
    this.providerToken = this.configService.get('CPF_PROVIDER_TOKEN') ?? ''
  }

  async consult(user: SupabaseAuthUser, dto: ConsultCpfDto) {
    const environment = dto.environment?.toLowerCase()
    const useTest = environment === 'test'
    const targetUrl = useTest ? this.testWebhookUrl : this.prodWebhookUrl
    const sanitizedCpf = dto.cpf.replace(/\D/g, '')

    // Carrega perfil e, se existir registro anterior para o mesmo CPF/empresa, reutiliza
    let profile = null as Awaited<ReturnType<typeof this.profileService.findProfileByUserId>>
    try {
      profile = await this.profileService.findProfileByUserId(user.id)
      if (profile?.company_id) {
        const { data: existing, error: fetchError } = await this.supabase
          .schema('heart')
          .from('cpf_consultas')
          .select('payload, status')
          .eq('company_id', profile.company_id)
          .or(`cpf.eq.${sanitizedCpf},cpf.eq.${dto.cpf}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (fetchError) {
          this.logger.warn('Falha ao buscar cache de consulta de CPF', fetchError as Error)
        } else if (existing?.payload) {
          return existing.payload
        }
      }
    } catch (error) {
      this.logger.warn('Falha ao buscar perfil para cache de CPF', error as Error)
    }

    let payload: unknown
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          targetUrl,
          { cpf: dto.cpf },
          {
            headers: {
              Authorization: this.providerToken ? `Bearer ${this.providerToken}` : undefined,
            },
          },
        ),
      )
      payload = response.data
    } catch (error) {
      this.logger.error('Falha ao consultar CPF no webhook', error as Error)
      payload = { status: 'error', message: 'Não foi possível consultar o CPF no momento.' }
    }

    // Persistência do log de consulta
    try {
      if (!profile?.company_id) {
        this.logger.warn(`Não foi possível registrar log de CPF: company_id ausente para user ${user.id}`)
      } else {
        const status =
          payload && typeof payload === 'object' && 'status' in payload && typeof (payload as any).status === 'string'
            ? (payload as any).status
            : 'success'

        await this.supabase
          .schema('heart')
          .from('cpf_consultas')
          .insert({
            company_id: profile.company_id,
            user_id: user.id,
            user_nome: profile.user_name ?? user.email ?? 'Usuário',
            cpf: sanitizedCpf || dto.cpf,
            payload,
            status,
          })
      }
    } catch (error) {
      this.logger.error('Falha ao registrar log de consulta de CPF', error as Error)
    }

    return payload
  }
}
