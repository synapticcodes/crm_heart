import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SupabaseService } from '../../../common/supabase/supabase.service'

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private readonly bucket: string
  private readonly uploadExpires: number
  private readonly downloadExpires: number

  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.get('CONTRACT_TEMPLATE_BUCKET') ?? 'contract_templates'
    this.uploadExpires = Number(this.configService.get('CONTRACT_TEMPLATE_UPLOAD_EXPIRES') ?? 60)
    this.downloadExpires = Number(this.configService.get('CONTRACT_TEMPLATE_DOWNLOAD_EXPIRES') ?? 60)
  }

  async createSignedUploadUrl(path: string) {
    const storage = this.supabase.admin.storage.from(this.bucket)
    const { data, error } = await storage.createSignedUploadUrl(path, this.uploadExpires)

    if (error || !data?.token) {
      this.logger.error('Falha ao gerar URL assinada de upload', error)
      throw error ?? new InternalServerErrorException('Não foi possível gerar URL assinada.')
    }

    return { path, token: data.token }
  }

  async createSignedDownloadUrl(path: string) {
    const storage = this.supabase.admin.storage.from(this.bucket)
    const { data, error } = await storage.createSignedUrl(path, this.downloadExpires)

    if (error || !data?.signedUrl) {
      this.logger.error('Falha ao gerar URL assinada de download', error)
      throw error ?? new InternalServerErrorException('Não foi possível gerar URL de download.')
    }

    return { signedUrl: data.signedUrl }
  }
}
