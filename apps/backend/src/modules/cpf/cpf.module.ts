import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { CpfController } from './cpf.controller'
import { CpfService } from './cpf.service'
import { ProfileService } from '../profile/profile.service'

@Module({
  imports: [HttpModule],
  controllers: [CpfController],
  providers: [CpfService, ProfileService],
})
export class CpfModule {}
