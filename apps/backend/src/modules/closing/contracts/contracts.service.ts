import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SupabaseService } from '../../../common/supabase/supabase.service'
import { CreateUploadUrlDto } from './dto/create-upload-url.dto'
import { DownloadTemplateDto } from './dto/download-template.dto'
import { SendContractDto } from './dto/send-contract.dto'
import { SignerService } from '../../core-integration/services/signer.service'
import { StorageService } from '../../core-integration/services/storage.service'

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name)
  private readonly templateDetailsTable = 'contract_template_details'
  private readonly dealsTable = 'deals'
  private readonly heartSchema: string

  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
    private readonly signerService: SignerService,
    private readonly storageService: StorageService,
  ) {
    this.heartSchema = this.configService.get('SUPABASE_HEART_SCHEMA') ?? 'heart'
  }

  async createUploadUrl(userId: string, dto: CreateUploadUrlDto) {
    const sanitized = dto.fileName.replace(/[^a-z0-9_.-]+/gi, '-')
    const path = `templates/${userId}/${Date.now()}-${sanitized}`

    return this.storageService.createSignedUploadUrl(path)
  }

  async createDownloadUrl(dto: DownloadTemplateDto) {
    const path = await this.resolveTemplatePath(dto.templateId)
    if (!path) {
      throw new InternalServerErrorException('Template não possui arquivo associado.')
    }

    return this.storageService.createSignedDownloadUrl(path)
  }

  async sendContract(userId: string, dto: SendContractDto) {
    const payload = {
      dealId: dto.dealId,
      templateId: dto.templateId,
      previewHtml: dto.previewHtml ?? null,
      sortable: dto.sortable ?? true,
      signers: dto.signers,
      requestedBy: userId,
      sentAt: new Date().toISOString(),
      dealSnapshot: dto.dealSnapshot ?? {},
    }

    await this.signerService.createEnvelope(payload)

    await this.supabase
      .schema(this.heartSchema)
      .from(this.dealsTable)
      .update({
        deal_status: 'contrato_enviado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', dto.dealId)

    return { success: true }
  }

  private async resolveTemplatePath(templateId: string) {
    const { data, error } = await this.supabase
      .schema(this.heartSchema)
      .from(this.templateDetailsTable)
      .select('storage_path')
      .eq('template_id', templateId)
      .maybeSingle()

    if (error) {
      this.logger.error('Erro ao buscar detalhes do template', error)
      throw error
    }

    return (data?.storage_path as string | undefined) ?? null
  }
}
