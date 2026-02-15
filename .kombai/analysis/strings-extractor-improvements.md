# Análise e Melhorias para `strings-extractor.ts`

## 📊 Resumo Executivo

O módulo `strings-extractor.ts` é uma ferramenta forense para extrair strings de arquivos binários. Foram identificadas **8 categorias de melhorias** que aumentarão performance, funcionalidade e robustez.

---

## 🔴 Problemas Críticos

### 1. Performance: Concatenação de Strings Ineficiente
**Problema:**
```typescript
currentString += String.fromCharCode(byte); // ❌ Linha 38
```

**Impacto:**
- String concatenation com `+=` cria um novo objeto string a cada iteração
- Para arquivos grandes, isso causa alocação excessiva de memória
- Complexidade O(n²) em vez de O(n)

**Solução:**
```typescript
// Use array e join no final
const charBuffer: number[] = [];
// ... no loop
charBuffer.push(byte);
// ... quando finalizar string
currentString = String.fromCharCode(...charBuffer);
charBuffer.length = 0;
```

**Ganho esperado:** 5-10x mais rápido para arquivos grandes

---

### 2. Unicode: Suporte Limitado
**Problema:**
```typescript
// Comentário promete "Unicode básicas" mas só implementa ASCII
const isPrintable = (byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13;
```

**Impacto:**
- Não detecta strings UTF-8 (ex: "usuário", "configuração")
- Perde dados importantes em arquivos modernos
- Inconsistente com a documentação

**Solução:**
Implementar decodificação UTF-8:
```typescript
function tryDecodeUTF8(bytes: Uint8Array, start: number): { char: string; length: number } | null {
  const byte1 = bytes[start];
  
  // 1-byte (ASCII)
  if (byte1 < 0x80) {
    return { char: String.fromCharCode(byte1), length: 1 };
  }
  
  // 2-byte UTF-8
  if ((byte1 & 0xE0) === 0xC0 && start + 1 < bytes.length) {
    const byte2 = bytes[start + 1];
    if ((byte2 & 0xC0) === 0x80) {
      const codePoint = ((byte1 & 0x1F) << 6) | (byte2 & 0x3F);
      return { char: String.fromCodePoint(codePoint), length: 2 };
    }
  }
  
  // 3-byte UTF-8 (BMP)
  if ((byte1 & 0xF0) === 0xE0 && start + 2 < bytes.length) {
    const byte2 = bytes[start + 1];
    const byte3 = bytes[start + 2];
    if ((byte2 & 0xC0) === 0x80 && (byte3 & 0xC0) === 0x80) {
      const codePoint = ((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F);
      return { char: String.fromCodePoint(codePoint), length: 3 };
    }
  }
  
  // 4-byte UTF-8 (emoji, símbolos raros)
  if ((byte1 & 0xF8) === 0xF0 && start + 3 < bytes.length) {
    const byte2 = bytes[start + 1];
    const byte3 = bytes[start + 2];
    const byte4 = bytes[start + 3];
    if ((byte2 & 0xC0) === 0x80 && (byte3 & 0xC0) === 0x80 && (byte4 & 0xC0) === 0x80) {
      const codePoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) | 
                        ((byte3 & 0x3F) << 6) | (byte4 & 0x3F);
      return { char: String.fromCodePoint(codePoint), length: 4 };
    }
  }
  
  return null;
}
```

---

### 3. Escalabilidade: Memória Limitada
**Problema:**
```typescript
const arrayBuffer = await file.arrayBuffer(); // ❌ Carrega arquivo inteiro
const bytes = new Uint8Array(arrayBuffer);
```

**Impacto:**
- Arquivos > 100MB podem travar o navegador
- Sem feedback de progresso para usuário
- Impossível cancelar operação

**Solução:**
Processar arquivo em chunks:
```typescript
export async function extractStrings(
  file: File, 
  minLength: number = 4,
  options?: {
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
  }
): Promise<StringsResult> {
  const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  const totalSize = file.size;
  let processedBytes = 0;
  
  for (let offset = 0; offset < totalSize; offset += CHUNK_SIZE) {
    // Check cancellation
    if (options?.signal?.aborted) {
      throw new Error('Operação cancelada');
    }
    
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Processar chunk...
    
    processedBytes += bytes.length;
    options?.onProgress?.(Math.round((processedBytes / totalSize) * 100));
  }
}
```

---

## 🟡 Problemas Moderados

### 4. Dados: Informações Imprecisas no Resultado
**Problema:**
```typescript
return {
  success: true,
  strings: strings,
  totalFound: strings.length, // ❌ Misleading quando MAX_STRINGS é atingido
  previewCount: strings.length // ❌ Redundante
};
```

**Impacto:**
- Se arquivo tem 5000 strings mas MAX_STRINGS = 2000, `totalFound` retorna 2000
- Usuário não sabe se há mais dados
- `previewCount` não adiciona valor

**Solução:**
```typescript
interface StringsResult {
  success: boolean;
  strings?: string[];
  totalFound: number;      // Total real de strings encontradas
  returned: number;        // Quantas foram retornadas (limitado por MAX_STRINGS)
  truncated: boolean;      // Se resultado foi truncado
  error?: string;
}

// No código
let totalStringsFound = 0;

// ... no loop
if (currentString.length >= minLength) {
  totalStringsFound++;
  if (strings.length < MAX_STRINGS) {
    strings.push(currentString);
  } else if (strings.length === MAX_STRINGS) {
    // Continue contando mas não adiciona mais
  }
}

return {
  success: true,
  strings,
  totalFound: totalStringsFound,
  returned: strings.length,
  truncated: totalStringsFound > MAX_STRINGS
};
```

---

### 5. Validação: Falta de Verificações de Entrada
**Problema:**
```typescript
export async function extractStrings(file: File, minLength: number = 4)
// ❌ Sem validação de minLength
```

**Impacto:**
- `minLength = 0` causaria resultados inúteis (muitos bytes únicos)
- `minLength = -1` causaria comportamento indefinido
- `minLength = 10000` poderia não retornar nada

**Solução:**
```typescript
export async function extractStrings(file: File, minLength: number = 4): Promise<StringsResult> {
  // Validações
  if (!file || file.size === 0) {
    return {
      success: false,
      error: 'Arquivo inválido ou vazio'
    };
  }
  
  if (minLength < 1) {
    return {
      success: false,
      error: 'minLength deve ser pelo menos 1'
    };
  }
  
  if (minLength > 1000) {
    return {
      success: false,
      error: 'minLength muito grande (máximo: 1000)'
    };
  }
  
  // ... resto do código
}
```

---

### 6. Manutenibilidade: Magic Numbers
**Problema:**
```typescript
const isPrintable = (byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13;
// ❌ Números mágicos não documentados
```

**Impacto:**
- Difícil entender à primeira vista
- Propenso a erros em manutenções futuras

**Solução:**
```typescript
// Constantes no topo do arquivo
const ASCII_PRINTABLE_START = 32;  // Espaço
const ASCII_PRINTABLE_END = 126;   // Til (~)
const ASCII_TAB = 9;
const ASCII_LINE_FEED = 10;
const ASCII_CARRIAGE_RETURN = 13;

function isPrintableASCII(byte: number): boolean {
  return (
    (byte >= ASCII_PRINTABLE_START && byte <= ASCII_PRINTABLE_END) ||
    byte === ASCII_TAB ||
    byte === ASCII_LINE_FEED ||
    byte === ASCII_CARRIAGE_RETURN
  );
}
```

---

## 🟢 Melhorias Desejáveis

### 7. Funcionalidade: Metadados Adicionais
**Recursos ausentes que agregariam valor:**

1. **Offset/Posição no arquivo:**
```typescript
interface StringMatch {
  value: string;
  offset: number;      // Posição no arquivo
  length: number;      // Tamanho em bytes
}

interface StringsResult {
  // ... campos existentes
  matches?: StringMatch[];  // Em vez de só string[]
}
```

2. **Detecção de padrões:**
```typescript
interface StringsResult {
  // ... campos existentes
  patterns?: {
    urls: string[];           // URLs encontradas
    emails: string[];         // E-mails
    ipAddresses: string[];    // IPs
    filePaths: string[];      // Caminhos de arquivo
    base64: string[];         // Possíveis strings base64
  };
}

// Regex patterns
const PATTERNS = {
  url: /https?:\/\/[^\s]+/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  windowsPath: /[a-zA-Z]:\\[^\s:*?"<>|]+/g,
  unixPath: /\/[a-zA-Z0-9_\-./]+/g,
};
```

3. **Estatísticas:**
```typescript
interface StringsResult {
  // ... campos existentes
  statistics?: {
    averageLength: number;
    maxLength: number;
    minLength: number;
    encodingConfidence: {
      ascii: number;    // 0-100%
      utf8: number;     // 0-100%
    };
  };
}
```

---

### 8. UX: Feedback e Controle
**Melhorias de experiência:**

1. **Progress callback** (já mencionado em #3)
2. **Cancellation token** (já mencionado em #3)
3. **Configuração de encoding:**
```typescript
interface ExtractOptions {
  encodings?: ('ascii' | 'utf8' | 'utf16le' | 'utf16be')[];
  caseSensitive?: boolean;
  includeWhitespace?: boolean;
  maxResults?: number;
}
```

---

## 📝 Recomendações de Implementação

### Prioridade Alta (Implementar imediatamente)
1. ✅ Corrigir performance (#1) - Usar array buffer
2. ✅ Adicionar suporte UTF-8 (#2) - Crucial para arquivos modernos
3. ✅ Validar entradas (#5) - Evitar erros do usuário

### Prioridade Média (Próxima sprint)
4. ✅ Processar em chunks (#3) - Para arquivos grandes
5. ✅ Corrigir totalFound (#4) - Dados precisos
6. ✅ Remover magic numbers (#6) - Código limpo

### Prioridade Baixa (Backlog)
7. ⚠️ Adicionar metadados (#7) - Nice to have
8. ⚠️ Melhorar UX (#8) - Pode ser iterativo

---

## 🧪 Casos de Teste Sugeridos

```typescript
// 1. Arquivo vazio
await extractStrings(new File([], 'empty.bin'));
// Esperado: { success: false, error: 'Arquivo inválido ou vazio' }

// 2. minLength inválido
await extractStrings(file, -1);
// Esperado: { success: false, error: 'minLength deve ser pelo menos 1' }

// 3. Strings ASCII básicas
const asciiFile = new File([new Uint8Array([72, 101, 108, 108, 111])], 'ascii.bin');
await extractStrings(asciiFile, 4);
// Esperado: { success: true, strings: ['Hello'] }

// 4. Strings UTF-8
const utf8Bytes = new TextEncoder().encode('Olá Mundo 🌍');
const utf8File = new File([utf8Bytes], 'utf8.bin');
await extractStrings(utf8File, 4);
// Esperado: { success: true, strings: ['Olá Mundo 🌍'] }

// 5. Arquivo grande (> MAX_STRINGS)
// Esperado: truncated: true, totalFound > returned

// 6. Cancelamento
const controller = new AbortController();
const promise = extractStrings(largeFile, 4, { signal: controller.signal });
controller.abort();
// Esperado: Reject com 'Operação cancelada'
```

---

## 📚 Referências

- [UTF-8 Encoding Spec](https://en.wikipedia.org/wiki/UTF-8)
- [Strings utility (Linux)](https://man7.org/linux/man-pages/man1/strings.1.html)
- [Web Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
- [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

---

## 💡 Exemplo de Uso Melhorado

```typescript
// Uso atual (limitado)
const result = await extractStrings(file, 4);
if (result.success) {
  console.log(result.strings); // Array de strings
}

// Uso futuro (rico em features)
const result = await extractStrings(file, 4, {
  encodings: ['ascii', 'utf8'],
  onProgress: (percent) => setProgress(percent),
  signal: abortController.signal,
  maxResults: 5000
});

if (result.success) {
  console.log(`Encontradas ${result.totalFound} strings (mostrando ${result.returned})`);
  console.log('URLs:', result.patterns?.urls);
  console.log('E-mails:', result.patterns?.emails);
  console.log('Estatísticas:', result.statistics);
  
  result.matches?.forEach(match => {
    console.log(`${match.value} @ offset 0x${match.offset.toString(16)}`);
  });
}
```
