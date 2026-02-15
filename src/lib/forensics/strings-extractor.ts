/**
 * Strings Extractor Module - Mobile Optimized
 * Extrai sequências de caracteres imprimíveis de arquivos binários
 * Útil para encontrar texto oculto, senhas, URLs ou pistas em imagens e executáveis.
 * 
 * Otimizado para dispositivos móveis com:
 * - Processamento em chunks para evitar travar o navegador
 * - Suporte UTF-8 para strings em português, emoji, etc.
 * - Progress callbacks para feedback visual
 * - Cancelamento de operações longas
 */

// ===== CONSTANTES =====

// Caracteres ASCII
const ASCII_PRINTABLE_START = 32;  // Espaço
const ASCII_PRINTABLE_END = 126;   // Til (~)
const ASCII_TAB = 9;
const ASCII_LINE_FEED = 10;
const ASCII_CARRIAGE_RETURN = 13;

// Limites de processamento (conservadores para mobile)
const MAX_STRINGS_MOBILE = 1000;   // Limite para dispositivos móveis
const MAX_STRINGS_DESKTOP = 3000;  // Limite para desktop
const CHUNK_SIZE = 512 * 1024;     // 512KB chunks (mobile-friendly)

// Tamanhos de arquivo
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB máximo

// ===== TIPOS =====

export interface StringMatch {
  value: string;
  offset: number;    // Posição no arquivo em bytes
  length: number;    // Tamanho da string em bytes
}

export interface StringsResult {
  success: boolean;
  matches?: StringMatch[];
  totalFound: number;      // Total real de strings encontradas
  returned: number;        // Quantas foram retornadas (limitado)
  truncated: boolean;      // Se resultado foi truncado
  bytesProcessed?: number; // Bytes processados
  error?: string;
}

export interface ExtractOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
  maxResults?: number;
  encodings?: ('ascii' | 'utf8')[];
}

// ===== FUNÇÕES AUXILIARES =====

/**
 * Verifica se um byte é ASCII imprimível ou controle comum
 */
function isPrintableASCII(byte: number): boolean {
  return (
    (byte >= ASCII_PRINTABLE_START && byte <= ASCII_PRINTABLE_END) ||
    byte === ASCII_TAB ||
    byte === ASCII_LINE_FEED ||
    byte === ASCII_CARRIAGE_RETURN
  );
}

/**
 * Tenta decodificar uma sequência UTF-8 válida
 * Retorna o caractere e quantos bytes consumiu, ou null se inválido
 */
function tryDecodeUTF8(bytes: Uint8Array, start: number): { char: string; length: number } | null {
  const byte1 = bytes[start];

  // 1-byte (ASCII padrão 0xxxxxxx)
  if (byte1 < 0x80) {
    return { char: String.fromCharCode(byte1), length: 1 };
  }

  // 2-byte UTF-8 (110xxxxx 10xxxxxx)
  if ((byte1 & 0xE0) === 0xC0 && start + 1 < bytes.length) {
    const byte2 = bytes[start + 1];
    if ((byte2 & 0xC0) === 0x80) {
      const codePoint = ((byte1 & 0x1F) << 6) | (byte2 & 0x3F);
      // Validar codepoint (deve ser >= 0x80)
      if (codePoint >= 0x80) {
        return { char: String.fromCodePoint(codePoint), length: 2 };
      }
    }
  }

  // 3-byte UTF-8 (1110xxxx 10xxxxxx 10xxxxxx)
  if ((byte1 & 0xF0) === 0xE0 && start + 2 < bytes.length) {
    const byte2 = bytes[start + 1];
    const byte3 = bytes[start + 2];
    if ((byte2 & 0xC0) === 0x80 && (byte3 & 0xC0) === 0x80) {
      const codePoint = ((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F);
      // Validar codepoint (deve ser >= 0x800 e não ser surrogate)
      if (codePoint >= 0x800 && (codePoint < 0xD800 || codePoint > 0xDFFF)) {
        return { char: String.fromCodePoint(codePoint), length: 3 };
      }
    }
  }

  // 4-byte UTF-8 (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx) - emoji, símbolos raros
  if ((byte1 & 0xF8) === 0xF0 && start + 3 < bytes.length) {
    const byte2 = bytes[start + 1];
    const byte3 = bytes[start + 2];
    const byte4 = bytes[start + 3];
    if ((byte2 & 0xC0) === 0x80 && (byte3 & 0xC0) === 0x80 && (byte4 & 0xC0) === 0x80) {
      const codePoint =
        ((byte1 & 0x07) << 18) |
        ((byte2 & 0x3F) << 12) |
        ((byte3 & 0x3F) << 6) |
        (byte4 & 0x3F);
      // Validar codepoint (deve ser >= 0x10000 e <= 0x10FFFF)
      if (codePoint >= 0x10000 && codePoint <= 0x10FFFF) {
        return { char: String.fromCodePoint(codePoint), length: 4 };
      }
    }
  }

  return null;
}

/**
 * Detecta se estamos em dispositivo móvel
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ===== FUNÇÃO PRINCIPAL =====

/**
 * Extrai strings ASCII e UTF-8 de um arquivo
 * Otimizado para mobile com processamento em chunks e progress feedback
 * 
 * @param file Arquivo para analisar
 * @param minLength Comprimento mínimo da string (padrão: 4)
 * @param options Opções de extração (progress, cancelamento, etc.)
 */
export async function extractStrings(
  file: File,
  minLength: number = 4,
  options?: ExtractOptions
): Promise<StringsResult> {
  // ===== VALIDAÇÕES =====
  
  if (!file || file.size === 0) {
    return {
      success: false,
      error: 'Arquivo inválido ou vazio',
      totalFound: 0,
      returned: 0,
      truncated: false
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `Arquivo muito grande (máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      totalFound: 0,
      returned: 0,
      truncated: false
    };
  }

  if (minLength < 1) {
    return {
      success: false,
      error: 'minLength deve ser pelo menos 1',
      totalFound: 0,
      returned: 0,
      truncated: false
    };
  }

  if (minLength > 1000) {
    return {
      success: false,
      error: 'minLength muito grande (máximo: 1000)',
      totalFound: 0,
      returned: 0,
      truncated: false
    };
  }

  // ===== CONFIGURAÇÃO =====
  
  const maxResults = options?.maxResults ?? (isMobileDevice() ? MAX_STRINGS_MOBILE : MAX_STRINGS_DESKTOP);
  const useUTF8 = !options?.encodings || options.encodings.includes('utf8');
  const matches: StringMatch[] = [];
  let totalStringsFound = 0;
  let bytesProcessed = 0;
  
  // Buffer para construir strings (mais eficiente que concatenação)
  let charBuffer: string[] = [];
  let stringStartOffset = 0;
  let stringByteLength = 0;

  try {
    // ===== PROCESSAMENTO EM CHUNKS =====
    
    const totalSize = file.size;
    
    for (let offset = 0; offset < totalSize; offset += CHUNK_SIZE) {
      // Verificar cancelamento
      if (options?.signal?.aborted) {
        throw new Error('Operação cancelada pelo usuário');
      }

      // Ler chunk do arquivo
      const end = Math.min(offset + CHUNK_SIZE, totalSize);
      const chunk = file.slice(offset, end);
      const arrayBuffer = await chunk.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Processar bytes do chunk
      let i = 0;
      while (i < bytes.length) {
        const globalOffset = offset + i;
        let decoded: { char: string; length: number } | null = null;

        // Tentar UTF-8 primeiro (se habilitado)
        if (useUTF8) {
          decoded = tryDecodeUTF8(bytes, i);
        }

        // Fallback para ASCII
        if (!decoded && isPrintableASCII(bytes[i])) {
          decoded = { char: String.fromCharCode(bytes[i]), length: 1 };
        }

        if (decoded) {
          // Caractere válido encontrado
          if (charBuffer.length === 0) {
            stringStartOffset = globalOffset;
            stringByteLength = 0;
          }
          charBuffer.push(decoded.char);
          stringByteLength += decoded.length;
          i += decoded.length;
        } else {
          // Byte não imprimível - finalizar string atual se válida
          if (charBuffer.length >= minLength) {
            totalStringsFound++;
            
            // Adicionar ao resultado se ainda não atingiu limite
            if (matches.length < maxResults) {
              matches.push({
                value: charBuffer.join(''),
                offset: stringStartOffset,
                length: stringByteLength
              });
            }
          }
          
          // Reset buffer
          charBuffer = [];
          stringByteLength = 0;
          i++;
        }
      }

      // Atualizar progresso
      bytesProcessed = end;
      if (options?.onProgress) {
        const percent = Math.round((bytesProcessed / totalSize) * 100);
        options.onProgress(percent);
      }

      // Yield para não bloquear UI (importante no mobile)
      if (offset + CHUNK_SIZE < totalSize) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Verificar última string (se arquivo terminar com texto)
    if (charBuffer.length >= minLength) {
      totalStringsFound++;
      if (matches.length < maxResults) {
        matches.push({
          value: charBuffer.join(''),
          offset: stringStartOffset,
          length: stringByteLength
        });
      }
    }

    // ===== RESULTADO =====
    
    return {
      success: true,
      matches,
      totalFound: totalStringsFound,
      returned: matches.length,
      truncated: totalStringsFound > maxResults,
      bytesProcessed
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao extrair strings do arquivo',
      totalFound: totalStringsFound,
      returned: matches.length,
      truncated: false,
      bytesProcessed
    };
  }
}

/**
 * Versão simplificada para compatibilidade com código existente
 * Retorna apenas array de strings (sem metadados)
 */
export async function extractStringsSimple(
  file: File,
  minLength: number = 4
): Promise<{ success: boolean; strings?: string[]; totalFound?: number; previewCount?: number; error?: string }> {
  const result = await extractStrings(file, minLength);
  
  if (!result.success) {
    return {
      success: false,
      error: result.error
    };
  }
  
  return {
    success: true,
    strings: result.matches?.map(m => m.value) || [],
    totalFound: result.totalFound,
    previewCount: result.returned
  };
}
