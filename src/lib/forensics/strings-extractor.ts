
/**
 * Strings Extractor Module
 * Extrai sequências de caracteres imprimíveis de arquivos binários
 * Útil para encontrar texto oculto, senhas, URLs ou pistas em imagens e executáveis.
 */

export interface StringsResult {
    success: boolean;
    strings?: string[];
    totalFound?: number;
    previewCount?: number;
    error?: string;
}

/**
 * Extrai strings ASCII e Unicode básicas de um arquivo
 * @param file Arquivo para analisar
 * @param minLength Comprimento mínimo da string (padrão: 4)
 */
export async function extractStrings(file: File, minLength: number = 4): Promise<StringsResult> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const strings: string[] = [];
        let currentString = '';

        // Limite de segurança para processamento no navegador
        const MAX_STRINGS = 2000;

        for (let i = 0; i < bytes.length; i++) {
            const byte = bytes[i];

            // Caracteres imprimíveis ASCII (32-126) e controles comuns (Tab, LF, CR)
            const isPrintable = (byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13;

            if (isPrintable) {
                currentString += String.fromCharCode(byte);
            } else {
                if (currentString.length >= minLength) {
                    strings.push(currentString);
                    if (strings.length >= MAX_STRINGS) break;
                }
                currentString = '';
            }
        }

        // Verificar a última string caso o arquivo termine com texto
        if (currentString.length >= minLength && strings.length < MAX_STRINGS) {
            strings.push(currentString);
        }

        return {
            success: true,
            strings: strings,
            totalFound: strings.length, // Note: se atingir MAX_STRINGS, este número é o teto.
            previewCount: strings.length
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao extrair strings do arquivo.'
        };
    }
}
