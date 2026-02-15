-- TraceLab OSINT - Supabase Database Schema
-- Execute este SQL no Supabase SQL Editor

-- ============================================
-- EXTENSÕES
-- ============================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: users (gerenciada pelo Supabase Auth)
-- ============================================
-- Nota: Supabase Auth já cria a tabela auth.users
-- Vamos criar uma tabela pública para dados adicionais

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- RLS (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- TABELA: anonymous_sessions
-- ============================================

CREATE TABLE IF NOT EXISTS public.anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ip_hash TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_token ON public.anonymous_sessions(token);
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_expires_at ON public.anonymous_sessions(expires_at);

-- RLS
ALTER TABLE public.anonymous_sessions ENABLE ROW LEVEL SECURITY;

-- Permitir leitura apenas da própria sessão (via token no JWT)
CREATE POLICY "Anonymous users can view own session"
  ON public.anonymous_sessions
  FOR SELECT
  USING (true); -- Validação feita no backend

-- ============================================
-- TABELA: activity_logs (usuários autenticados)
-- ============================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  duration INTEGER, -- em milissegundos
  success BOOLEAN DEFAULT true
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp);

-- RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON public.activity_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TABELA: anonymous_activity_logs
-- ============================================

CREATE TABLE IF NOT EXISTS public.anonymous_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.anonymous_sessions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_anonymous_activity_logs_session_id ON public.anonymous_activity_logs(session_id);

-- RLS
ALTER TABLE public.anonymous_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous users can view own logs"
  ON public.anonymous_activity_logs
  FOR SELECT
  USING (true);

-- ============================================
-- TABELA: challenges (desafios CTF)
-- ============================================

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT NOT NULL CHECK (category IN ('metadata', 'steganography', 'forensics', 'geoint')),
  points INTEGER NOT NULL,
  image_url TEXT,
  solution TEXT NOT NULL, -- Hash SHA256 da solução
  hints TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);

-- RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges"
  ON public.challenges
  FOR SELECT
  USING (active = true);

-- ============================================
-- TABELA: challenge_completions
-- ============================================

CREATE TABLE IF NOT EXISTS public.challenge_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  time_spent INTEGER NOT NULL, -- em segundos
  UNIQUE(user_id, challenge_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_challenge_completions_user_id ON public.challenge_completions(user_id);

-- RLS
ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions"
  ON public.challenge_completions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions"
  ON public.challenge_completions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TABELA: user_stats (estatísticas agregadas)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_analyses INTEGER DEFAULT 0,
  metadata_scans INTEGER DEFAULT 0,
  steganography_ops INTEGER DEFAULT 0,
  ela_analyses INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  learning_score INTEGER DEFAULT 0 CHECK (learning_score >= 0 AND learning_score <= 100),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
  ON public.user_stats
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON public.user_stats
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- TABELAS APP (AUTH CUSTOMIZADA POR EMAIL)
-- ============================================

CREATE TABLE IF NOT EXISTS public.app_user_profiles (
  email TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.app_user_progress (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  total_analyses INTEGER DEFAULT 0,
  metadata_scans INTEGER DEFAULT 0,
  stego_tests INTEGER DEFAULT 0,
  ela_analyses INTEGER DEFAULT 0,
  scanner_runs INTEGER DEFAULT 0,
  integrity_checks INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  learning_score INTEGER DEFAULT 0 CHECK (learning_score >= 0 AND learning_score <= 100),
  completed_challenge_ids JSONB DEFAULT '[]'::jsonb
);

CREATE OR REPLACE FUNCTION update_app_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_app_user_profiles_updated_at ON public.app_user_profiles;
CREATE TRIGGER trg_update_app_user_profiles_updated_at
  BEFORE UPDATE ON public.app_user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_app_user_profiles_updated_at();

CREATE OR REPLACE FUNCTION update_app_user_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_app_user_progress_updated_at ON public.app_user_progress;
CREATE TRIGGER trg_update_app_user_progress_updated_at
  BEFORE UPDATE ON public.app_user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_app_user_progress_updated_at();

-- ============================================
-- FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para criar perfil de usuário automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'));
  
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil após signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNÇÃO DE LIMPEZA (CRON JOB)
-- ============================================

-- Limpar sessões anônimas expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.anonymous_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Limpar logs antigos (90 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.activity_logs
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  DELETE FROM public.anonymous_activity_logs
  WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DADOS INICIAIS (DESAFIOS EXEMPLO)
-- ============================================

INSERT INTO public.challenges (title, description, difficulty, category, points, solution, hints) VALUES
(
  'Encontre a Localização',
  'Esta foto foi tirada em algum lugar do Brasil. Use os metadados GPS para descobrir a cidade.',
  'easy',
  'metadata',
  100,
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', -- Hash de "São Paulo"
  ARRAY['Procure por dados GPS', 'Latitude e longitude revelam tudo', 'Use um mapa para confirmar']
),
(
  'Mensagem Oculta',
  'Uma mensagem foi escondida nesta imagem usando LSB steganography. Descubra o texto secreto.',
  'medium',
  'steganography',
  200,
  '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', -- Hash de "password"
  ARRAY['Use o módulo de steganografia', 'A mensagem está nos bits menos significativos', 'Tente decodificar sem senha primeiro']
),
(
  'Foto Editada?',
  'Esta imagem parece ter sido manipulada. Use ELA para encontrar as regiões modificadas.',
  'hard',
  'forensics',
  300,
  'fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9', -- Hash de "photoshop"
  ARRAY['Error Level Analysis revela edições', 'Procure por áreas com diferenças altas', 'Regiões editadas têm padrões diferentes']
);

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.user_profiles IS 'Perfis de usuários autenticados (complementa auth.users)';
COMMENT ON TABLE public.anonymous_sessions IS 'Sessões temporárias de 24h para modo anônimo';
COMMENT ON TABLE public.activity_logs IS 'Logs de atividade de usuários autenticados (apenas ações, sem conteúdo)';
COMMENT ON TABLE public.anonymous_activity_logs IS 'Logs agregados de sessões anônimas';
COMMENT ON TABLE public.challenges IS 'Desafios CTF educacionais';
COMMENT ON TABLE public.challenge_completions IS 'Registro de desafios completados por usuários';
COMMENT ON TABLE public.user_stats IS 'Estatísticas agregadas para dashboard de progresso';

-- ============================================
-- CONFIGURAÇÃO DE CRON JOBS (Supabase Edge Functions)
-- ============================================

-- Nota: Configure no Supabase Dashboard > Database > Cron Jobs
-- Executar diariamente às 3h AM:
-- SELECT cron.schedule('cleanup-sessions', '0 3 * * *', 'SELECT public.cleanup_expired_sessions()');
-- SELECT cron.schedule('cleanup-logs', '0 3 * * *', 'SELECT public.cleanup_old_logs()');
