import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { AuthUser } from '../../common/decorators/auth-user.decorator'
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard'
import { CpfService } from './cpf.service'
import { ConsultCpfDto } from './dto/consult-cpf.dto'
import type { SupabaseAuthUser } from '../../common/interfaces/auth-user.interface'

@Controller('cpf')
@UseGuards(SupabaseAuthGuard)
export class CpfController {
  constructor(private readonly cpfService: CpfService) {}

  @Post('consult')
  async consult(@AuthUser() user: SupabaseAuthUser, @Body() dto: ConsultCpfDto) {
    const result = await this.cpfService.consult(user, dto)
    return { success: true, result }
  }
}
