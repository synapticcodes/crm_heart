# CRM Heart – Backend NestJS

Este backend substitui as Edge Functions utilizadas pelo frontend.  
Ele expõe rotas HTTP convencionais para que o app web deixe de depender do `supabase.functions.invoke`.

## Como executar

```bash
cd apps/backend
npm install
cp .env.example .env # configure as variáveis
npm run start:dev
```

## Endpoints principais

| Rota | Método | Descrição | Substitui Edge Function |
|------|--------|-----------|-------------------------|
| `/activity` | `POST` | Registra heartbeat/idle do usuário autenticado | `user-activity` |
| `/geolocation/collect` | `POST` | Coleta IP e atualiza metadados no Supabase | `collect-user-geolocation` |
| `/contracts/upload-url` | `POST` | Gera URL/tokens para `uploadToSignedUrl` do Supabase Storage | `contract-template-upload-url` |
| `/contracts/download-url` | `POST` | Cria URL de download temporária para o template | `contract-template-download-url` |
| `/contracts/send` | `POST` | Envia o contrato para a Autentique (ou outro provedor) | `autentique-send-contract` |
| `/cpf/consult` | `POST` | Proxy para serviço externo de consulta de CPF (webhook) | `cpf-consultation` |
| `/team/invite` | `POST` | Convida um colaborador | `team-invite` |
| `/team/blacklist` | `POST` | Marca usuário como “blacklisted” | `team-blacklist` |
| `/team/delete` | `POST` | Remove definitivamente o registro da equipe | `team-delete` |
| `/webhooks/autentique` | `POST` | Recebe eventos da Autentique (assinaturas, finalização) e sincroniza `heart.contratos/deals` | `autentique-webhook` |

Todos os endpoints (exceto download/upload que já exigem token do usuário) utilizam o `SupabaseAuthGuard`, que valida o `Authorization: Bearer <access_token>` enviado automaticamente pelo `supabase-js`.

### Consulta de CPF

- Rota: `POST /cpf/consult`
- Payload: `{ cpf: string (11 dígitos), environment?: 'test' | 'prod' | 'production' }`
  - `environment` é opcional. Se `test`, envia para o webhook de teste; caso contrário, usa produção.
- Webhooks usados (podem ser sobrescritos via env):
  - Teste: `CPF_WEBHOOK_TEST_URL` (default `https://auto.meunomeok.uk/webhook-test/b466b2a8-0abc-419b-8603-011dc71e77cc`)
  - Produção: `CPF_WEBHOOK_PROD_URL` (default `https://autowebhook.meunomeok.uk/webhook/b466b2a8-0abc-419b-8603-011dc71e77cc`)
- O serviço simplesmente repassa `{ cpf }` ao webhook selecionado e devolve o corpo da resposta para o frontend montar o modal e baixar o PDF.

## Próximos passos

1. Ajustar o frontend para chamar estas rotas (ex.: `fetch('/api/contracts/send', …)`) em vez de `supabase.functions.invoke`.
2. Configurar a infra (API Gateway / Reverse Proxy) apontando para o NestJS.
3. Migrar a lógica específica de cada função Edge (por exemplo, integrações detalhadas com a Autentique) para dentro dos serviços correspondentes, caso ainda exista algo no projeto original.
