# 🏗️ Arquitetura do TraceLab OSINT

## 📐 Visão Geral

TraceLab OSINT é uma plataforma educacional de forense digital com arquitetura **client-heavy**, onde 95% do processamento ocorre no navegador para máxima privacidade.

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│                    (Next.js 16 + React 19)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Metadata   │  │ Steganography│  │   Forensics  │      │
│  │  Extractor   │  │     Lab      │  │   Analysis   │      │
│  │              │  │              │  │              │      │
│  │ • EXIF       │  │ • LSB Encode │  │ • ELA        │      │
│  │ • GPS        │  │ • LSB Decode │  │ • Heatmap    │      │
│  │ • IPTC       │  │ • Entropy    │  │ • Scanner    │      │
│  │ • XMP        │  │ • Detection  │  │ • Timeline   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Canvas API + File Processing               │   │
│  │  • ImageData manipulation                            │   │
│  │  • Pixel-level analysis                              │   │
│  │  • Binary data parsing                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ (Apenas Auth & Logs)
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                      BACKEND                                  │
│                  (Next.js API Routes)                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │     Auth     │  │  Rate Limit  │  │   Activity   │       │
│  │   Service    │  │   Middleware │  │     Logs     │       │
│  │              │  │              │  │              │       │
│  │ • JWT        │  │ • IP Hash    │  │ • Timestamp  │       │
│  │ • Bcrypt     │  │ • Counter    │  │ • Action     │       │
│  │ • Sessions   │  │ • Window     │  │ • Duration   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Supabase Client                           │  │
│  │  • @supabase/supabase-js                               │  │
│  │  • Row Level Security                                  │  │
│  │  • Real-time subscriptions (opcional)                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
└──────────────────────┬────────────────────────────────────────┘
                       │
                       │
┌──────────────────────▼────────────────────────────────────────┐
│                    SUPABASE                                    │
│                  (Backend as a Service)                        │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  PostgreSQL  │  │  Supabase    │  │   Storage    │        │
│  │   Database   │  │     Auth     │  │   (Bucket)   │        │
│  │              │  │              │  │              │        │
│  │ • Users      │  │ • JWT        │  │ • Avatars    │        │
│  │ • Sessions   │  │ • OAuth      │  │ • Uploads    │        │
│  │ • Logs       │  │ • MFA        │  │ (opcional)   │        │
│  │ • Challenges │  │ • RLS        │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              Cron Jobs (pg_cron)                       │   │
│  │  • cleanup_expired_sessions() - Diário 3h AM          │   │
│  │  • cleanup_old_logs() - Diário 3h AM                  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## 🔐 Fluxo de Autenticação

### Modo Autenticado

```
┌─────────┐                ┌──────────┐              ┌──────────┐
│ Cliente │                │ Next.js  │              │ Supabase │
└────┬────┘                └────┬─────┘              └────┬─────┘
     │                          │                         │
     │ 1. POST /api/auth/signup │                         │
     ├─────────────────────────►│                         │
     │                          │ 2. supabase.auth.signUp │
     │                          ├────────────────────────►│
     │                          │                         │
     │                          │ 3. User created + JWT   │
     │                          │◄────────────────────────┤
     │ 4. JWT + User data       │                         │
     │◄─────────────────────────┤                         │
     │                          │                         │
     │ 5. Requests com JWT      │                         │
     ├─────────────────────────►│                         │
     │                          │ 6. Verify JWT + RLS     │
     │                          ├────────────────────────►│
     │                          │                         │
     │                          │ 7. Data (filtered by RLS)
     │                          │◄────────────────────────┤
     │ 8. Response              │                         │
     │◄─────────────────────────┤                         │
```

### Modo Anônimo

```
┌─────────┐                ┌──────────┐              ┌──────────┐
│ Cliente │                │ Next.js  │              │ Supabase │
└────┬────┘                └────┬─────┘              └────┬─────┘
     │                          │                         │
     │ 1. POST /api/auth/anonymous                        │
     ├─────────────────────────►│                         │
     │                          │ 2. Create session       │
     │                          ├────────────────────────►│
     │                          │    (UUID + token)       │
     │                          │                         │
     │                          │ 3. Session created      │
     │                          │◄────────────────────────┤
     │ 4. Session token         │                         │
     │◄─────────────────────────┤                         │
     │                          │                         │
     │ 5. Requests (24h)        │                         │
     ├─────────────────────────►│                         │
     │                          │ 6. Validate session     │
     │                          ├────────────────────────►│
     │                          │                         │
     │ 7. Response              │                         │
     │◄─────────────────────────┤                         │
     │                          │                         │
     │ [Após 24h]               │                         │
     │                          │ 8. Cron: DELETE session │
     │                          │◄────────────────────────┤
```

## 📊 Fluxo de Dados (Análise de Metadados)

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (Cliente)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User seleciona arquivo                                  │
│     ↓                                                        │
│  2. FileReader.readAsArrayBuffer()                          │
│     ↓                                                        │
│  3. DataView parsing (EXIF/GPS/IPTC)                        │
│     ↓                                                        │
│  4. Metadata extraction (100% local)                        │
│     ↓                                                        │
│  5. Risk assessment                                         │
│     ↓                                                        │
│  6. Display results                                         │
│     ↓                                                        │
│  7. (Opcional) Log action to server                         │
│     │                                                        │
│     └──────────────────────────────────────────────────────►│
│                                                              │
│                                                         ┌────▼────┐
│                                                         │ Supabase│
│                                                         │         │
│                                                         │ INSERT  │
│                                                         │ activity│
│                                                         │ _logs   │
│                                                         └─────────┘
│                                                              │
│  ⚠️ IMPORTANTE: Arquivo NUNCA é enviado ao servidor         │
│  ⚠️ Metadados extraídos NUNCA são armazenados               │
│  ⚠️ Apenas ação é logada: "metadata_scan" + timestamp       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Fluxo de Esteganografia

```
┌─────────────────────────────────────────────────────────────┐
│                  ENCODE (Ocultar Dados)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User upload imagem PNG                                  │
│     ↓                                                        │
│  2. Load to Canvas                                          │
│     ↓                                                        │
│  3. getImageData() → Uint8ClampedArray                      │
│     ↓                                                        │
│  4. Convert text to bytes                                   │
│     ↓                                                        │
│  5. (Opcional) XOR encryption with password                 │
│     ↓                                                        │
│  6. Write to LSBs (Least Significant Bits)                  │
│     │                                                        │
│     │  For each pixel (R, G, B):                            │
│     │    pixel[i] = (pixel[i] & 0xFE) | messageBit          │
│     │                                                        │
│     ↓                                                        │
│  7. putImageData() → Canvas                                 │
│     ↓                                                        │
│  8. toDataURL('image/png') → Base64                         │
│     ↓                                                        │
│  9. Download modified image                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  DECODE (Extrair Dados)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User upload imagem PNG                                  │
│     ↓                                                        │
│  2. Load to Canvas                                          │
│     ↓                                                        │
│  3. getImageData() → Uint8ClampedArray                      │
│     ↓                                                        │
│  4. Extract LSBs                                            │
│     │                                                        │
│     │  For each pixel:                                      │
│     │    bit = pixel[i] & 1                                 │
│     │    currentByte = (currentByte << 1) | bit             │
│     │                                                        │
│     ↓                                                        │
│  5. Check for EOF delimiter (<<<EOF>>>)                     │
│     ↓                                                        │
│  6. Convert bytes to text                                   │
│     ↓                                                        │
│  7. (Opcional) XOR decryption with password                 │
│     ↓                                                        │
│  8. Display extracted message                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🔬 Fluxo de ELA (Error Level Analysis)

```
┌─────────────────────────────────────────────────────────────┐
│              ELA - Detecção de Manipulação                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Load original image                                     │
│     ↓                                                        │
│  2. getImageData() → originalData                           │
│     ↓                                                        │
│  3. Recompress with quality=90                              │
│     │  canvas.toBlob(callback, 'image/jpeg', 0.90)          │
│     ↓                                                        │
│  4. Load recompressed image                                 │
│     ↓                                                        │
│  5. getImageData() → recompressedData                       │
│     ↓                                                        │
│  6. Calculate pixel differences                             │
│     │                                                        │
│     │  For each pixel:                                      │
│     │    diff = |original[i] - recompressed[i]|             │
│     │    amplified = diff * 15  // Amplification            │
│     │                                                        │
│     ↓                                                        │
│  7. Generate ELA image (grayscale)                          │
│     ↓                                                        │
│  8. Generate heatmap (colored)                              │
│     │  Blue (low) → Green → Yellow → Red (high)             │
│     ↓                                                        │
│  9. Detect suspicious regions (32x32 blocks)                │
│     ↓                                                        │
│  10. Calculate manipulation score (0-100)                   │
│     ↓                                                        │
│  11. Display results + warnings                             │
│                                                              │
│  ⚠️ ELA é INDICADOR, não prova definitiva                   │
│  ⚠️ Falsos positivos: texto, bordas, alto contraste         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🔒 Segurança em Camadas

### Layer 1: Frontend

- ✅ Input sanitization
- ✅ XSS prevention
- ✅ CORS configurado
- ✅ Content Security Policy

### Layer 2: API Routes

- ✅ Rate limiting (IP hash)
- ✅ JWT validation
- ✅ Request size limits
- ✅ Brute force protection

### Layer 3: Supabase

- ✅ Row Level Security (RLS)
- ✅ Prepared statements (SQL injection prevention)
- ✅ Encrypted connections (TLS)
- ✅ Automatic backups

### Layer 4: Dados

- ✅ Bcrypt (12 rounds) para senhas
- ✅ JWT com expiração
- ✅ Hash SHA256 para IPs
- ✅ Nenhum arquivo armazenado

## 📈 Performance

### Otimizações Implementadas

1. **Client-Side Processing**
   - Sem latência de rede para análise
   - Processamento paralelo (Web Workers possível)

2. **Code Splitting**
   - Next.js automatic code splitting
   - Lazy loading de componentes pesados

3. **Image Optimization**
   - Canvas API nativa (hardware accelerated)
   - Processamento incremental para arquivos grandes

4. **Database**
   - Índices em colunas frequentemente consultadas
   - RLS policies otimizadas
   - Cron jobs para limpeza automática

## 🎯 Casos de Uso

### 1. Jornalista Investigativo

```
Cenário: Verificar autenticidade de foto recebida
Fluxo:
  1. Upload da imagem
  2. Análise de metadados → GPS revela localização
  3. ELA → Detecta possível edição
  4. Scanner de inconsistências → Timestamp não bate com GPS
  5. Conclusão: Foto suspeita, investigar mais
```

### 2. Educador de Segurança

```
Cenário: Ensinar alunos sobre privacidade digital
Fluxo:
  1. Demonstrar extração de GPS de foto pessoal
  2. Mostrar no mapa a localização exata
  3. Explicar riscos (stalking, doxxing)
  4. Ensinar a remover metadados (Digital Hygiene Tool)
  5. Alunos praticam com desafios CTF
```

### 3. Pesquisador de Segurança

```
Cenário: Analisar imagem suspeita de deepfake
Fluxo:
  1. ELA para detectar manipulação
  2. Análise de histogramas
  3. Scanner de inconsistências (software vs dispositivo)
  4. Gerar relatório técnico em PDF
  5. Documentar achados
```

## 📚 Tecnologias e Bibliotecas

### Core

- **Next.js 16**: Framework React com SSR/SSG
- **React 19**: UI library
- **TypeScript 5**: Type safety
- **Tailwind CSS 4**: Styling

### Análise

- **Canvas API**: Manipulação de pixels
- **FileReader API**: Leitura de arquivos
- **DataView**: Parsing binário
- **TextEncoder/Decoder**: Conversão de texto

### Backend

- **Supabase**: BaaS (Auth + Database + Storage)
- **@supabase/supabase-js**: Cliente JavaScript
- **bcryptjs**: Hash de senhas
- **jsonwebtoken**: JWT

### Utilidades

- **crypto-js**: Criptografia
- **pako**: Compressão
- **jspdf**: Geração de PDFs
- **html2canvas**: Captura de tela
- **leaflet**: Mapas interativos
- **react-leaflet**: Wrapper React para Leaflet

## 🚀 Deploy

### Vercel (Recomendado)

```bash
# 1. Conectar repositório GitHub
# 2. Configurar env vars no Vercel Dashboard
# 3. Deploy automático a cada push
```

### Docker (Alternativo)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Métricas e Monitoramento

### Supabase Dashboard

- Requisições por segundo
- Latência de queries
- Uso de storage
- Usuários ativos

### (Opcional) Sentry

- Error tracking
- Performance monitoring
- User feedback

---

**Arquitetura projetada para privacidade, performance e educação.**

*"Privacidade não é paranoia. É engenharia aplicada à vida real."*
