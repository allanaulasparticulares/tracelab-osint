# 🚀 Guia de Setup do Supabase

Este guia mostra como configurar o backend do TraceLab OSINT usando Supabase.

## 📋 Pré-requisitos

- Conta no [Supabase](https://supabase.com) (gratuita)
- Node.js 18+ instalado

## 🔧 Passo a Passo

### 1. Criar Projeto no Supabase

1. Acesse [app.supabase.com](https://app.supabase.com)
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: `tracelab-osint`
   - **Database Password**: Escolha uma senha forte
   - **Region**: Escolha a mais próxima (ex: South America - São Paulo)
4. Clique em **"Create new project"**
5. Aguarde ~2 minutos para o projeto ser provisionado

### 2. Obter Credenciais

1. No dashboard do projeto, vá em **Settings** → **API**
2. Copie:
   - **Project URL** (ex: `https://xyzcompany.supabase.co`)
   - **anon public** key (chave pública, segura para usar no frontend)

### 3. Configurar Variáveis de Ambiente

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env.local
   ```

2. Edite `.env.local` e preencha:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

### 4. Executar Schema SQL

1. No Supabase Dashboard, vá em **SQL Editor**
2. Clique em **"New query"**
3. Copie todo o conteúdo de `supabase/schema.sql`
4. Cole no editor
5. Clique em **"Run"** (ou pressione Ctrl+Enter)
6. Aguarde a execução (deve mostrar "Success")

### 5. Configurar Autenticação

1. Vá em **Authentication** → **Providers**
2. Habilite **Email** (já vem habilitado por padrão)
3. (Opcional) Habilite **Google** ou **GitHub** OAuth:
   - Clique no provider desejado
   - Siga as instruções para obter Client ID e Secret
   - Salve as configurações

### 6. Configurar Email Templates (Opcional)

1. Vá em **Authentication** → **Email Templates**
2. Personalize os templates de:
   - Confirmação de email
   - Redefinição de senha
   - Convite

### 7. Configurar Cron Jobs (Limpeza Automática)

1. Vá em **Database** → **Cron Jobs** (ou use extensão pg_cron)
2. Adicione dois jobs:

**Job 1: Limpar sessões expiradas**
```sql
SELECT cron.schedule(
  'cleanup-sessions',
  '0 3 * * *',  -- Diariamente às 3h AM
  'SELECT public.cleanup_expired_sessions()'
);
```

**Job 2: Limpar logs antigos**
```sql
SELECT cron.schedule(
  'cleanup-logs',
  '0 3 * * *',  -- Diariamente às 3h AM
  'SELECT public.cleanup_old_logs()'
);
```

### 8. Verificar Instalação

Execute no SQL Editor:

```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verificar desafios iniciais
SELECT title, difficulty, category, points 
FROM public.challenges;

-- Verificar RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

Deve retornar:
- 7 tabelas
- 3 desafios
- Múltiplas policies de RLS

### 9. Testar Localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 🔒 Segurança

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado. Isso significa:

- ✅ Usuários só veem seus próprios dados
- ✅ Sessões anônimas são isoladas
- ✅ Desafios são públicos (somente leitura)
- ✅ Logs são privados por usuário

### Políticas Implementadas

```sql
-- Exemplo: Usuários só veem próprios logs
CREATE POLICY "Users can view own logs"
  ON public.activity_logs
  FOR SELECT
  USING (auth.uid() = user_id);
```

## 📊 Estrutura do Banco

```
┌─────────────────────────────────────────┐
│          auth.users (Supabase)          │
│  - id, email, encrypted_password        │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼────────┐  ┌────▼──────────┐
│ user_profiles  │  │  user_stats   │
│ - name         │  │ - total_...   │
│ - last_login   │  │ - points      │
└───────┬────────┘  └───────────────┘
        │
        │
┌───────▼────────┐
│ activity_logs  │
│ - action       │
│ - timestamp    │
└────────────────┘

┌─────────────────────────────────────────┐
│      anonymous_sessions                 │
│  - token, expires_at                    │
└────────────────┬────────────────────────┘
                 │
        ┌────────▼────────────────┐
        │ anonymous_activity_logs │
        │ - action, timestamp     │
        └─────────────────────────┘

┌─────────────────────────────────────────┐
│           challenges (CTF)              │
│  - title, difficulty, points            │
└────────────────┬────────────────────────┘
                 │
        ┌────────▼──────────────┐
        │ challenge_completions │
        │ - user_id, time_spent │
        └───────────────────────┘
```

## 🧪 Dados de Teste

O schema já inclui 3 desafios iniciais:

1. **Encontre a Localização** (Easy, 100 pts)
2. **Mensagem Oculta** (Medium, 200 pts)
3. **Foto Editada?** (Hard, 300 pts)

## 🔄 Migrações Futuras

Para adicionar novas tabelas ou modificar existentes:

1. Crie um novo arquivo SQL em `supabase/migrations/`
2. Execute no SQL Editor
3. Documente as mudanças

## 🐛 Troubleshooting

### Erro: "relation does not exist"

- Verifique se o schema SQL foi executado completamente
- Confirme que está usando o schema `public`

### Erro: "new row violates row-level security policy"

- Verifique se o usuário está autenticado
- Confirme que as policies RLS estão corretas

### Sessões anônimas não expiram

- Verifique se os cron jobs foram configurados
- Execute manualmente: `SELECT public.cleanup_expired_sessions();`

## 📚 Recursos

- [Documentação Supabase](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## 🚀 Deploy em Produção

### Vercel

1. Conecte seu repositório GitHub ao Vercel
2. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy automático a cada push

### Outras Plataformas

Configure as mesmas variáveis de ambiente em:
- Netlify
- Railway
- Render
- Fly.io

## ✅ Checklist de Setup

- [ ] Projeto criado no Supabase
- [ ] Credenciais copiadas
- [ ] `.env.local` configurado
- [ ] Schema SQL executado
- [ ] Tabelas verificadas
- [ ] RLS policies ativas
- [ ] Cron jobs configurados
- [ ] Desafios iniciais carregados
- [ ] Teste local funcionando
- [ ] (Opcional) OAuth configurado

---

**Pronto!** Seu backend Supabase está configurado. 🎉

Próximo passo: Execute `npm run dev` e comece a usar o TraceLab OSINT.
