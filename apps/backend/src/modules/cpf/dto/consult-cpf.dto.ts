import { IsIn, IsOptional, IsString, Length } from 'class-validator'

export class ConsultCpfDto {
  @IsString()
  @Length(11, 14)
  cpf!: string

  /**
   * Ambiente de consulta. Se omitido, usa produção.
   */
  @IsOptional()
  @IsString()
  @IsIn(['test', 'prod', 'production'])
  environment?: 'test' | 'prod' | 'production'
}
