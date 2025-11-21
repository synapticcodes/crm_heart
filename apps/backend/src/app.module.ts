import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ActivityModule } from './modules/sales/activity/activity.module'
import { SupabaseModule } from './common/supabase/supabase.module'
import { RemarketingModule } from './modules/ops/remarketing/remarketing.module'
import { ContractsModule } from './modules/closing/contracts/contracts.module'
import { TeamModule } from './modules/ops/team/team.module'
import { AutentiqueWebhookModule } from './modules/ops/webhooks/autentique/autentique-webhook.module'

// Shared Utils should not be Modules typically, but if they were, they are now under shared/utils.
// If they were pure utility modules, we might need to adjust.
// Assuming they are NestJS modules given the file content.
// Let's import them from new paths if they are still modules.
import { GeolocationModule } from './shared/utils/geolocation/geolocation.module'
import { CpfModule } from './shared/utils/cpf/cpf.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    ActivityModule,
    GeolocationModule, // Now a shared utility module
    RemarketingModule,
    ContractsModule,
    CpfModule,         // Now a shared utility module
    TeamModule,
    AutentiqueWebhookModule,
  ],
})
export class AppModule {}
