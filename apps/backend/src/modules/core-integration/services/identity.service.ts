import { Injectable, BadRequestException } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import { SupabaseService } from '../../../common/supabase/supabase.service'

@Injectable()
export class IdentityService {
  constructor(private readonly supabase: SupabaseService) {}

  async createUser(email: string, name: string, role: string) {
    const password = this.generatePassword()

    const { data, error } = await this.supabase.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role,
      },
      app_metadata: {
        role,
      },
    })

    if (error || !data?.user) {
      throw new BadRequestException(error?.message ?? 'Falha ao criar usuário no Supabase Auth.')
    }

    return { user: data.user, password }
  }

  async deleteUser(userId: string) {
    await this.supabase.admin.auth.admin.deleteUser(userId)
  }

  private generatePassword(length = 12) {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
    const random = randomBytes(length)
    let password = ''
    for (let index = 0; index < length; index += 1) {
      const byte = random[index]
      password += charset[byte % charset.length]
    }
    return password
  }
}
