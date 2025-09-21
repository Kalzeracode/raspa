# Relatório de Arquitetura e Conexões do Sistema

## 📋 Resumo Executivo

Este é um sistema de jogos de raspadinha online com pagamentos PIX, sistema de afiliados e painel administrativo. O projeto utiliza React + TypeScript no frontend, Supabase como backend, e implementa autenticação, transações financeiras e gamificação.

## 🏗️ Arquitetura Geral

```
Frontend (React/TypeScript) ↔ Supabase Backend ↔ Integrações Externas
├── Components & Pages      ├── Database (PostgreSQL)    ├── Sistema PIX (Woovi)
├── Authentication Context  ├── Edge Functions          └── APIs de Pagamento
├── UI Components (shadcn)  ├── Storage (Imagens)
└── Routing (React Router)  └── Real-time Subscriptions
```

## 🗄️ Esquema do Banco de Dados

### Tabelas Principais

#### **profiles** - Dados dos usuários
- `user_id` (UUID): Chave primária, referência ao auth.users
- `email` (TEXT): Email do usuário
- `role` (app_role): 'user' | 'admin' | 'influencer'
- `saldo` (NUMERIC): Saldo atual do usuário
- `afiliado_id` (UUID): ID do afiliado que indicou
- `referral_code` (TEXT): Código de indicação

#### **raspadinhas** - Jogos disponíveis
- `id` (UUID): Identificador único
- `nome` (TEXT): Nome do jogo
- `premio` (NUMERIC): Valor do prêmio
- `chances` (NUMERIC): Probabilidade de ganhar (0-1)
- `imagem_url` (TEXT): URL da imagem
- `ativo` (BOOLEAN): Se está ativo

#### **jogadas** - Histórico de jogos
- `user_id` (UUID): Quem jogou
- `raspadinha_id` (UUID): Qual jogo
- `resultado` (BOOLEAN): Se ganhou
- `premio_ganho` (NUMERIC): Valor ganho
- `is_simulated` (BOOLEAN): Se é teste/simulação

#### **balance_transactions** - Transações financeiras
- `user_id` (UUID): Usuário da transação
- `transaction_type` (TEXT): Tipo da transação
- `amount` (NUMERIC): Valor
- `previous_balance` (NUMERIC): Saldo anterior
- `new_balance` (NUMERIC): Novo saldo
- `is_simulated` (BOOLEAN): Se é simulação

#### **influencers** - Sistema de afiliados
- `user_id` (UUID): ID do influenciador
- `code` (TEXT): Código único de indicação
- `commission_rate` (NUMERIC): Taxa de comissão
- `total_referrals` (INTEGER): Total de indicações
- `total_earnings` (NUMERIC): Total ganho

#### **credit_purchases** - Compras de crédito
- `user_id` (UUID): Usuário
- `amount` (NUMERIC): Valor
- `status` (TEXT): 'pending' | 'completed' | 'failed'
- `external_ref` (TEXT): Referência externa (PIX)
- `is_simulated` (BOOLEAN): Se é teste

#### **withdrawal_requests** - Solicitações de saque
- `user_id` (UUID): Usuário
- `amount` (NUMERIC): Valor do saque
- `status` (TEXT): Status da solicitação
- `payment_details` (JSONB): Dados PIX
- `risk_score` (INTEGER): Score de risco

### Tabelas de Apoio
- **promotions**: Promoções e descontos
- **referrals**: Controle de indicações
- **bonus_claims**: Solicitações de bônus
- **audit_log**: Log de auditoria
- **rate_limits**: Controle de taxa de uso

## 🔐 Sistema de Autenticação e Autorização

### Fluxo de Autenticação
1. Usuário se registra/loga via Supabase Auth
2. Trigger `handle_new_user()` cria perfil automaticamente
3. RLS (Row Level Security) controla acesso aos dados
4. Context `AuthContext` gerencia estado no frontend

### Roles e Permissões
- **user**: Usuário padrão, acesso aos próprios dados
- **admin**: Acesso total ao sistema
- **influencer**: Acesso a dados de afiliados

### RLS Policies Principais
- Usuários só veem próprios dados financeiros
- Admins têm acesso a tudo com auditoria
- Influencers veem próprias estatísticas

## ⚙️ Edge Functions (Supabase)

### **process-game** - Processamento de jogos
- Valida saldo do usuário
- Calcula resultado baseado nas chances
- Atualiza saldo e registra jogada
- Retorna resultado para o frontend

### **create-pix** - Criação de pagamentos PIX
- Integração com API Woovi
- Cria cobrança PIX
- Armazena referência externa
- Retorna QR Code e dados para pagamento

### **woovi-webhook** - Webhook de pagamentos
- Recebe notificações de pagamento
- Valida assinatura da requisição
- Atualiza status de compras
- Adiciona saldo ao usuário

### **woovi-webhook-expired** - Pagamentos expirados
- Processa pagamentos que expiraram
- Atualiza status para 'failed'
- Limpa referências não utilizadas

### **create-influencer** - Criação de influenciadores
- Cria conta de influenciador
- Gera código único de indicação
- Define taxa de comissão
- Só admins podem executar

### **handle-user-referral** - Processamento de indicações
- Registra indicação quando usuário se cadastra
- Calcula comissões quando há primeiro depósito
- Atualiza estatísticas do influenciador

## 📱 Estrutura do Frontend

### Páginas Principais
- **/** (Index): Página inicial com jogos
- **/raspadinhas**: Lista completa de jogos
- **/conta**: Área do usuário
- **/admin**: Painel administrativo
- **/afiliados**: Área de afiliados
- **/influencer**: Dashboard do influenciador

### Componentes Críticos

#### **AuthContext** (`src/contexts/AuthContext.tsx`)
- Gerencia estado de autenticação
- Conecta com Supabase Auth
- Fornece dados do usuário para toda aplicação

#### **BuyAndPlayModal** (`src/components/BuyAndPlayModal.tsx`)
- Modal para comprar e jogar raspadinhas
- Integra com sistema de pagamento
- Gerencia fluxo de jogo

#### **ScratchGrid** (`src/components/ScratchGrid.tsx`)
- Interface de raspadinha interativa
- Canvas para efeito de "raspar"
- Animações e feedback visual

#### **AdminDashboard** (`src/components/AdminDashboard.tsx`)
- Painel de controle administrativo
- Estatísticas em tempo real
- Gerenciamento de usuários e jogos

### Utilitários Importantes

#### **scratch-card-utils.ts** (`src/lib/scratch-card-utils.ts`)
- Calcula preços baseado no prêmio
- Valida preços de cartas
- Enhances de dados de raspadinhas

## 💰 Sistema Financeiro

### Fluxo de Depósito
1. Usuário clica em "Adicionar Saldo"
2. `DepositModal` abre com opções
3. Edge function `create-pix` gera cobrança
4. Usuário paga via PIX
5. Webhook `woovi-webhook` confirma pagamento
6. Saldo é adicionado via `update_user_balance_secure_v3()`

### Fluxo de Saque
1. Usuário solicita saque em "Conta"
2. `create_withdrawal_request_secure()` valida e cria solicitação
3. Admin aprova/rejeita no painel
4. Processamento manual via PIX

### Controles de Segurança
- Rate limiting por operação
- Validação de saldo antes de jogadas
- Auditoria completa de transações
- Prevenção de saldo negativo

## 🎮 Sistema de Jogos

### Fluxo de Jogo
1. Usuário seleciona raspadinha
2. `BuyAndPlayModal` verifica saldo
3. Edge function `process-game` ou `purchase_and_play_scratch_card()` processa
4. Resultado calculado baseado em `chances` da raspadinha
5. Saldo atualizado automaticamente
6. Transação registrada em `balance_transactions`

### Cálculo de Preços
```javascript
// Casa e Onix - 10 reais
// High value (50k+, Moto, Casa) - 5 reais  
// Small prizes (≤500) - 50 centavos
// Default (iPhone, 10k, 5k, 1k) - 1 real
```

## 📊 Sistema de Análise

### Métricas Principais
- Total de usuários
- Volume de depósitos (real vs simulado)
- Número de jogadas
- Taxa de conversão
- Atividade por dia

### Dados Disponíveis
- Dashboard admin com estatísticas em tempo real
- Histórico de transações completo
- Análise de comportamento de usuários
- Monitoramento de atividade suspeita

## 🔗 Integrações Externas

### Woovi (PIX)
- API para criação de cobranças PIX
- Webhooks para confirmação de pagamento
- Gerenciamento de status de transações

### Supabase Storage
- Armazenamento de imagens das raspadinhas
- URLs públicas para acesso

## 🛡️ Segurança

### Medidas Implementadas
- Row Level Security (RLS) em todas as tabelas
- Auditoria completa de operações administrativas
- Rate limiting para operações financeiras
- Validação de PIX keys
- Logs de segurança detalhados

### Funções de Segurança
- `check_suspicious_activity()`: Monitora atividade suspeita
- `log_security_event()`: Registra eventos de segurança
- `emergency_security_disable()`: Função de emergência para admins

## 📦 Dependências Críticas

### Frontend
- **React 18**: Framework principal
- **TypeScript**: Tipagem estática
- **Vite**: Build tool
- **React Router**: Roteamento
- **Tailwind CSS**: Estilização
- **shadcn/ui**: Componentes UI
- **Supabase Client**: Comunicação com backend

### Backend (Supabase)
- **PostgreSQL**: Banco de dados
- **PostgREST**: API automática
- **Supabase Auth**: Autenticação
- **Supabase Storage**: Armazenamento
- **Deno**: Runtime para Edge Functions

## 🚀 Deployment e Ambiente

### Configuração Atual
- **Frontend**: Deploy automático via Lovable
- **Backend**: Supabase Cloud
- **Project ID**: `sibdsejxpjgdlpdzcgej`
- **Domínio**: Lovable staging domain

### Variáveis Importantes
- Chaves Supabase configuradas automaticamente
- Secrets para APIs externas via Supabase Vault
- URLs e configurações em `supabase/config.toml`

## 📋 Guia para Modificações

### Para Adicionar Nova Feature
1. **Database**: Criar tabelas/colunas necessárias via migration
2. **RLS**: Configurar políticas de acesso apropriadas  
3. **Types**: Atualizar interfaces TypeScript
4. **Functions**: Criar edge functions se necessário
5. **Frontend**: Implementar componentes e páginas
6. **Testing**: Testar fluxo completo

### Para Modificar Sistema Financeiro
1. Sempre usar `update_user_balance_secure_v3()`
2. Incluir metadata com detalhes da operação
3. Implementar validações de rate limiting
4. Registrar em audit_log para compliance
5. Testar com dados simulados primeiro

### Para Adicionar Novo Tipo de Jogo
1. Estender tabela `raspadinhas` se necessário
2. Criar lógica específica em edge function
3. Implementar componente visual
4. Configurar preços em `scratch-card-utils.ts`
5. Adicionar ao sistema de estatísticas

## 🔄 Fluxos Críticos do Sistema

### Cadastro com Referral
```
Usuário acessa link → Context captura código → 
Registro → Trigger handle_new_user() → 
Atualiza profiles com afiliado_id
```

### Primeiro Depósito
```
Depósito completado → Trigger handle_first_deposit_commission() →
Calcula comissão para influencer → Atualiza earnings
```

### Processamento de Jogo
```
Seleção de jogo → Validação de saldo → 
Cálculo de resultado → Atualização de saldo →
Registro de transação → Retorno para frontend
```

## 📞 Contatos e Suporte

Para modificações no sistema:
1. Consulte este documento primeiro
2. Verifique logs de auditoria para comportamento atual
3. Use funções existentes quando possível
4. Implemente testes com dados simulados
5. Monitore métricas após deploy

---

*Documento gerado automaticamente - Última atualização: 2025-09-18*