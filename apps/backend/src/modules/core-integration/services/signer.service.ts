import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'

@Injectable()
export class SignerService {
  private readonly autentiqueUrl: string
  private readonly autentiqueToken: string

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.autentiqueUrl =
      this.configService.get('AUTENTIQUE_API_URL') ?? 'https://api.autentique.com.br/graphql'
    this.autentiqueToken = this.configService.get('AUTENTIQUE_API_TOKEN') ?? 'autentique-token'
  }

  async createEnvelope(payload: any) {
    const { data } = await firstValueFrom(
      this.httpService.post(this.autentiqueUrl, payload, {
        headers: {
          Authorization: `Bearer ${this.autentiqueToken}`,
        },
        timeout: 15_000,
      }),
    )
    return data
  }
}
