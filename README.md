# 🔬 TraceLab OSINT

**Laboratório Educacional de Forense Digital e Análise OSINT**

> *"Toda imagem é um pacote de dados. Toda foto pode ser um relatório técnico disfarçado."*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## 📋 Índice

- [Sobre](#sobre)
- [Recursos](#recursos)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Uso](#uso)
- [Módulos](#módulos)
- [Segurança](#segurança)
- [Filosofia](#filosofia)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

## 🎯 Sobre

TraceLab OSINT é uma plataforma educacional focada em ensinar:

- **Metadata Intelligence**: Extração e análise de EXIF, GPS, IPTC, XMP
- **Steganography**: Técnicas de ocultação e detecção de dados em arquivos
- **Forensic Analysis**: ELA, análise de inconsistências, detecção de manipulação
- **GeoINT**: Análise geoespacial e correlação de coordenadas

### ⚠️ Aviso Ético

Esta ferramenta é **exclusivamente educacional**. Não deve ser usada para:
- ❌ Invasão de privacidade
- ❌ Vigilância não autorizada
- ❌ Atividades ilegais
- ❌ Manipulação maliciosa de evidências

**OSINT não é espionagem. É leitura inteligente de rastros digitais.**

## ✨ Recursos

### 🔍 Módulo 1: Metadata Intelligence

- ✅ Extração completa de metadados (JPEG, PNG, WEBP, PDF, MP3, MP4)
- ✅ Análise de GPS com visualização em mapa (Leaflet)
- ✅ Detecção de dispositivo e software de edição
- ✅ Análise de timestamps e histórico de edição
- ✅ Avaliação de risco de privacidade (baixo/médio/alto)
- ✅ Explicações educacionais para cada metadado

### 🧪 Módulo 2: Steganography Lab

- ✅ **Encode**: Ocultar texto em imagens PNG (LSB)
- ✅ **Decode**: Extrair dados ocultos
- ✅ Criptografia opcional (XOR com senha)
- ✅ Visualização comparativa (original vs modificado)
- ✅ Análise de diferenças bit a bit
- ✅ Scanner de padrões suspeitos
- ✅ Cálculo de entropia e detecção probabilística

### 🔬 Módulo 3: Forensic Analysis

- ✅ **ELA (Error Level Analysis)**: Detecção de manipulação
- ✅ Mapa de calor de diferenças
- ✅ Detecção de regiões suspeitas
- ✅ Scanner de inconsistências temporais
- ✅ Análise geoespacial (GPS vs timezone)
- ✅ Detecção de combinações impossíveis (dispositivo vs software)
- ✅ Timeline de eventos

### 🧹 Módulo 4: Digital Hygiene Tool

- ✅ Remoção completa de metadados
- ✅ Re-encode seguro de imagens
- ✅ Strip de EXIF/GPS
- ✅ Comparação antes/depois
- ✅ Relatório de redução de exposição

### 🎓 Recursos Educacionais

- ✅ Explicações contextuais para cada metadado
- ✅ Desafios CTF (Capture The Flag)
- ✅ Dashboard de progresso e estatísticas
- ✅ Geração de relatórios técnicos em PDF
- ✅ Modo "Explicar Como se Fosse Aula"

### 🔐 Autenticação Híbrida

- ✅ Login tradicional (JWT + bcrypt)
- ✅ Login anônimo (sessão temporária 24h)
- ✅ Proteção contra brute force
- ✅ Rate limiting inteligente
- ✅ Logs éticos (sem coleta abusiva)

## 🏗️ Arquitetura

### Stack Tecnológica

```
Frontend:
├── Next.js 16 (App Router)
├── TypeScript 5
├── Tailwind CSS 4
├── React 19
└── Leaflet (mapas)

Backend:
├── Next.js API Routes
├── Prisma ORM
├── PostgreSQL
├── JWT (autenticação)
└── bcrypt (hash de senhas)

Bibliotecas Especializadas:
├── piexifjs (EXIF)
├── crypto-js (criptografia)
├── pako (compressão)
├── jspdf (relatórios)
└── html2canvas (captura)
```

### Processamento Client-Side

**95% do processamento ocorre no navegador:**
- ✅ Extração de metadados
- ✅ Análise ELA
- ✅ Steganography encode/decode
- ✅ Geração de relatórios

**Apenas autenticação e logs no servidor.**

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Metadata   │  │ Steganography│  │   Forensics  │  │
│  │  Extractor   │  │     Lab      │  │   Analysis   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                          │                               │
│                  ┌───────▼────────┐                      │
│                  │  File Handler  │                      │
│                  └───────┬────────┘                      │
│                          │                               │
│                  ┌───────▼────────┐                      │
│                  │  Canvas API    │                      │
│                  └────────────────┘                      │
└─────────────────────────────────────────────────────────┘
                           │
                           │ (Apenas Auth & Logs)
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  SERVIDOR (Next.js API)                  │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │     Auth     │  │  Rate Limit  │  │   Activity   │  │
│  │   Service    │  │   Middleware │  │     Logs     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                          │                               │
│                  ┌───────▼────────┐                      │
│                  │  Prisma ORM    │                      │
│                  └───────┬────────┘                      │
│                          │                               │
│                  ┌───────▼────────┐                      │
│                  │  PostgreSQL    │                      │
│                  └────────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+ 
- PostgreSQL 14+
- npm ou yarn

### Passo a Passo

1. **Clone o repositório**

```bash
git clone https://github.com/seu-usuario/tracelab-osint.git
cd tracelab-osint
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tracelab"

# JWT
JWT_SECRET="seu-secret-super-seguro-aqui"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

4. **Configure o banco de dados**

```bash
npx prisma generate
npx prisma db push
```

5. **Inicie o servidor de desenvolvimento**

```bash
npm run dev
```

6. **Acesse a aplicação**

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## 📖 Uso

### Modo Rápido (Anônimo)

1. Acesse a página inicial
2. Clique em **"Modo Anônimo"**
3. Faça upload de uma imagem
4. Explore os metadados extraídos

### Modo Completo (Autenticado)

1. Crie uma conta
2. Faça login
3. Acesse o dashboard
4. Utilize todos os módulos
5. Acompanhe seu progresso
6. Resolva desafios CTF

### Exemplo de Uso da API

```typescript
import { extractImageMetadata } from '@/lib/metadata/extractor';
import { performELA } from '@/lib/forensics/ela-analysis';
import { encodePNG } from '@/lib/steganography/png-stego';

// Extrair metadados
const result = await extractImageMetadata(imageFile);
console.log(result.metadata);

// Análise ELA
const elaResult = await performELA(imageFile, 90);
console.log(elaResult.suspiciousRegions);

// Esteganografia
const stegoResult = await encodePNG(imageFile, 'Mensagem secreta', 'senha123');
console.log(stegoResult.image); // Base64
```

## 🧩 Módulos

### Metadata Extractor

**Arquivo**: `src/lib/metadata/extractor.ts`

Extrai metadados de imagens (JPEG, PNG, WEBP) incluindo:
- EXIF (câmera, configurações)
- GPS (coordenadas, altitude)
- IPTC (autor, copyright)
- XMP (Adobe metadata)
- Timestamps (criação, modificação)

### ELA Analysis

**Arquivo**: `src/lib/forensics/ela-analysis.ts`

Error Level Analysis para detecção de manipulação:
- Recompressão JPEG
- Cálculo de diferenças pixel a pixel
- Geração de mapa de calor
- Detecção de regiões suspeitas

### Inconsistency Scanner

**Arquivo**: `src/lib/forensics/inconsistency-scanner.ts`

Cruza metadados para detectar anomalias:
- Análise temporal (timestamps)
- Análise geoespacial (GPS vs timezone)
- Análise de dispositivo vs software
- Timeline de eventos

### PNG Steganography

**Arquivo**: `src/lib/steganography/png-stego.ts`

LSB (Least Significant Bit) steganography:
- Encode: ocultar texto em imagens
- Decode: extrair dados ocultos
- Criptografia XOR opcional
- Análise de entropia

## 🔒 Segurança

### Princípios

1. **Processamento Local**: 95% no cliente
2. **Sem Armazenamento**: Arquivos não são salvos
3. **Logs Éticos**: Apenas ações, sem conteúdo
4. **Rate Limiting**: Proteção contra abuso
5. **HTTPS Obrigatório**: Comunicação criptografada

### Proteções Implementadas

- ✅ Bcrypt (12 rounds) para senhas
- ✅ JWT com expiração
- ✅ CSRF protection
- ✅ Helmet.js (security headers)
- ✅ Input sanitization
- ✅ SQL injection prevention (Prisma)
- ✅ Brute force protection

### Conformidade LGPD

- ✅ Coleta mínima de dados
- ✅ Modo anônimo disponível
- ✅ Logs agregados (não detalhados)
- ✅ Auto-delete de sessões expiradas
- ✅ Política de privacidade transparente

## 🧠 Filosofia

### Princípios Fundamentais

1. **Educação > Vigilância**
   - Ferramenta para aprender, não para espionar

2. **Transparência Técnica**
   - Explicar limitações e falsos positivos
   - ELA é indicador, não prova

3. **Privacidade por Design**
   - Processamento local
   - Sem coleta abusiva

4. **Rastreabilidade Ética**
   - Logs mínimos para governança
   - Sem vigilância desnecessária

5. **OSINT é Correlação**
   - Ensinar raciocínio analítico
   - Cruzamento de dados

### Citações

> *"OSINT não é espionagem. É leitura inteligente de rastros digitais."*

> *"Autenticação não deve ser vigilância. Anonimato não deve ser descontrole."*

> *"A internet não esquece — ela só indexa."*

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Diretrizes

- Mantenha o foco educacional
- Respeite a filosofia de privacidade
- Documente novos recursos
- Adicione testes quando possível

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🙏 Agradecimentos

- Comunidade OSINT
- Pesquisadores de segurança digital
- Educadores em forense digital

## 📞 Contato

- **Website**: [tracelab-osint.vercel.app](https://tracelab-osint.vercel.app)
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/tracelab-osint/issues)

---

**Desenvolvido com 💚 para educação em segurança digital**

*Privacidade não é paranoia. É engenharia aplicada à vida real.*
