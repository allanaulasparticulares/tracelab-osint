/**
 * PNG Steganography - LSB (Least Significant Bit) Implementation
 * Oculta dados nos bits menos significativos dos pixels
 */

export interface StegoResult {
  success: boolean;
  data?: string;
  image?: string; // Base64
  error?: string;
  stats?: {
    capacity: number;
    used: number;
    efficiency: number;
  };
}

/**
 * Codifica texto em uma imagem PNG usando LSB
 */
export async function encodePNG(
  imageFile: File,
  secretText: string,
  password?: string
): Promise<StegoResult> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    // Carregar imagem
    const img = await loadImage(imageFile);
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calcular capacidade (3 bytes RGB por pixel, 1 bit por byte)
    const capacity = Math.floor((data.length / 4) * 3 / 8); // em bytes
    
    // Preparar mensagem
    let message = secretText;
    if (password) {
      message = simpleEncrypt(secretText, password);
    }
    
    // Adicionar delimitador de fim
    const fullMessage = message + '<<<EOF>>>';
    const messageBytes = textToBytes(fullMessage);

    if (messageBytes.length > capacity) {
      return {
        success: false,
        error: `Mensagem muito grande. Capacidade: ${capacity} bytes, Necessário: ${messageBytes.length} bytes`
      };
    }

    // Codificar mensagem nos LSBs
    let byteIndex = 0;
    let bitIndex = 0;

    for (let i = 0; i < data.length && byteIndex < messageBytes.length; i++) {
      // Pular canal alpha (cada 4º byte)
      if (i % 4 === 3) continue;

      // Pegar bit da mensagem
      const messageBit = (messageBytes[byteIndex] >> (7 - bitIndex)) & 1;

      // Substituir LSB do pixel
      data[i] = (data[i] & 0xFE) | messageBit;

      bitIndex++;
      if (bitIndex === 8) {
        bitIndex = 0;
        byteIndex++;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    const encodedImage = canvas.toDataURL('image/png');

    return {
      success: true,
      image: encodedImage,
      stats: {
        capacity,
        used: messageBytes.length,
        efficiency: (messageBytes.length / capacity) * 100
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Decodifica texto oculto em uma imagem PNG
 */
export async function decodePNG(
  imageFile: File,
  password?: string
): Promise<StegoResult> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const img = await loadImage(imageFile);
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Extrair bits
    const extractedBytes: number[] = [];
    let currentByte = 0;
    let bitIndex = 0;

    for (let i = 0; i < data.length; i++) {
      // Pular canal alpha
      if (i % 4 === 3) continue;

      // Extrair LSB
      const bit = data[i] & 1;
      currentByte = (currentByte << 1) | bit;

      bitIndex++;
      if (bitIndex === 8) {
        extractedBytes.push(currentByte);
        currentByte = 0;
        bitIndex = 0;

        // Verificar delimitador de fim
        if (extractedBytes.length >= 9) {
          const lastChars = bytesToText(extractedBytes.slice(-9));
          if (lastChars === '<<<EOF>>>') {
            break;
          }
        }
      }
    }

    if (extractedBytes.length === 0) {
      return {
        success: false,
        error: 'Nenhuma mensagem encontrada'
      };
    }

    // Remover delimitador
    const messageBytes = extractedBytes.slice(0, -9);
    let message = bytesToText(messageBytes);

    // Descriptografar se necessário
    if (password) {
      try {
        message = simpleDecrypt(message, password);
      } catch {
        return {
          success: false,
          error: 'Senha incorreta ou dados corrompidos'
        };
      }
    }

    return {
      success: true,
      data: message
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao decodificar'
    };
  }
}

/**
 * Analisa imagem para detectar possível esteganografia
 */
export async function analyzePNG(imageFile: File): Promise<{
  suspicious: boolean;
  score: number;
  indicators: string[];
}> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  const img = await loadImage(imageFile);
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const indicators: string[] = [];
  let score = 0;

  // Análise 1: Distribuição de LSBs
  let lsbOnes = 0;
  let lsbTotal = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (i % 4 === 3) continue; // Pular alpha
    lsbTotal++;
    if (data[i] & 1) lsbOnes++;
  }

  const lsbRatio = lsbOnes / lsbTotal;
  
  // LSBs devem estar próximos de 50% em imagens naturais
  if (Math.abs(lsbRatio - 0.5) < 0.02) {
    score += 30;
    indicators.push('Distribuição uniforme de LSBs (suspeito)');
  }

  // Análise 2: Entropia dos LSBs
  const lsbEntropy = calculateLSBEntropy(data);
  if (lsbEntropy > 0.95) {
    score += 40;
    indicators.push('Alta entropia nos LSBs (dados ocultos prováveis)');
  }

  // Análise 3: Padrões sequenciais
  const hasSequentialPatterns = detectSequentialPatterns(data);
  if (hasSequentialPatterns) {
    score += 30;
    indicators.push('Padrões sequenciais detectados');
  }

  return {
    suspicious: score > 50,
    score,
    indicators
  };
}

// Funções auxiliares

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };

    img.src = objectUrl;
  });
}

function textToBytes(text: string): number[] {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text));
}

function bytesToText(bytes: number[]): string {
  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(bytes));
}

function simpleEncrypt(text: string, password: string): string {
  // XOR simples com hash da senha
  const keyBytes = textToBytes(password);
  const textBytes = textToBytes(text);
  const encrypted: number[] = [];

  for (let i = 0; i < textBytes.length; i++) {
    encrypted.push(textBytes[i] ^ keyBytes[i % keyBytes.length]);
  }

  return btoa(String.fromCharCode(...encrypted));
}

function simpleDecrypt(encrypted: string, password: string): string {
  const keyBytes = textToBytes(password);
  const encryptedBytes = Array.from(atob(encrypted), c => c.charCodeAt(0));
  const decrypted: number[] = [];

  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted.push(encryptedBytes[i] ^ keyBytes[i % keyBytes.length]);
  }

  return bytesToText(decrypted);
}

function calculateLSBEntropy(data: Uint8ClampedArray): number {
  const lsbCounts = new Array(8).fill(0);
  let total = 0;

  for (let i = 0; i < data.length; i += 4) {
    const lsbs = ((data[i] & 1) << 2) | ((data[i + 1] & 1) << 1) | (data[i + 2] & 1);
    lsbCounts[lsbs]++;
    total++;
  }

  let entropy = 0;
  for (const count of lsbCounts) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }

  return entropy / Math.log2(8); // Normalizar para 0-1
}

function detectSequentialPatterns(data: Uint8ClampedArray): boolean {
  let sequenceCount = 0;
  let lastLSB = -1;
  let sequenceLength = 0;

  for (let i = 0; i < Math.min(data.length, 10000); i++) {
    if (i % 4 === 3) continue;
    
    const lsb = data[i] & 1;
    if (lsb === lastLSB) {
      sequenceLength++;
      if (sequenceLength > 20) {
        sequenceCount++;
      }
    } else {
      sequenceLength = 0;
    }
    lastLSB = lsb;
  }

  return sequenceCount > 5;
}
