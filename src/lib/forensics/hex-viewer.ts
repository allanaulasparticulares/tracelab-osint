
/**
 * Hex Viewer Utility
 * Lê chunks de arquivos para exibição em formato hexadecimal/ASCII
 */

export interface HexChunk {
    offset: number;
    hex: string[];  // Array de linhas hex
    ascii: string[]; // Array de linhas ascii
    bytesRead: number;
}

const BYTES_PER_LINE = 16;
// Lê um bloco do arquivo. Offset é onde começa, length é tamanho do bloco.
export async function readHexChunk(file: File, offset: number, length: number): Promise<HexChunk> {
    // Garante que não lemos além do fim
    const end = Math.min(offset + length, file.size);
    const blob = file.slice(offset, end);
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const hexLines: string[] = [];
    const asciiLines: string[] = [];

    for (let i = 0; i < bytes.length; i += BYTES_PER_LINE) {
        const slice = bytes.slice(i, i + BYTES_PER_LINE);

        // Hex
        let hexLine = '';
        for (let j = 0; j < slice.length; j++) {
            hexLine += slice[j].toString(16).padStart(2, '0') + ' ';
            if (j === 7) hexLine += ' '; // Espaço extra no meio
        }
        // Padding se linha incompleta
        if (slice.length < BYTES_PER_LINE) {
            const missing = BYTES_PER_LINE - slice.length;
            hexLine += '   '.repeat(missing); // 2 chars + 1 space
            if (slice.length <= 8 && 8 < BYTES_PER_LINE) hexLine += ' '; // Compensar espaço extra do meio se não alcançou
        }

        // ASCII
        let asciiLine = '';
        for (let j = 0; j < slice.length; j++) {
            const b = slice[j];
            // Caracteres imprimíveis
            asciiLine += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
        }

        hexLines.push(hexLine.trimEnd());
        asciiLines.push(asciiLine);
    }

    return {
        offset,
        hex: hexLines,
        ascii: asciiLines,
        bytesRead: bytes.length
    };
}
