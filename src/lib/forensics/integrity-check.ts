export interface IntegrityResult {
    success: boolean;
    summary?: {
        sha256: string;
        fileSize: number;
        mimeType: string;
        extension: string;
        magicType: string;
        extensionMatchesMagic: boolean;
        entropy: number;
        riskScore: number;
        riskLevel: 'low' | 'medium' | 'high';
        magicBytes?: string;
    };
    warnings?: string[];
    error?: string;
}

const MAGIC_SIGNATURES: Array<{ type: string; bytes: number[] }> = [
    { type: 'JPEG', bytes: [0xff, 0xd8, 0xff] },
    { type: 'PNG', bytes: [0x89, 0x50, 0x4e, 0x47] },
    { type: 'WEBP', bytes: [0x52, 0x49, 0x46, 0x46] },
    { type: 'GIF', bytes: [0x47, 0x49, 0x46, 0x38] }
];

export async function analyzeIntegrity(file: File): Promise<IntegrityResult> {
    try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        const sha256 = await computeSHA256(bytes);
        const magicType = detectMagic(bytes);
        const extension = extractExtension(file.name);
        const extensionMatchesMagic = matchExtensionToMagic(extension, magicType);
        const entropy = calculateByteEntropy(bytes);

        const warnings: string[] = [];
        let riskScore = 0;

        if (!extensionMatchesMagic) {
            riskScore += 35;
            warnings.push('Extensão do arquivo não corresponde à assinatura binária (magic bytes).');
        }

        if (entropy > 7.9) {
            riskScore += 20;
            warnings.push('Entropia muito alta: arquivo pode estar fortemente comprimido/ofuscado.');
        } else if (entropy < 4.0) {
            riskScore += 20;
            warnings.push('Entropia muito baixa: possível estrutura artificial ou dados repetitivos.');
        }

        if (magicType === 'UNKNOWN') {
            riskScore += 25;
            warnings.push('Assinatura binária não reconhecida para imagem comum.');
        }

        const riskLevel = riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low';

        return {
            success: true,
            summary: {
                sha256,
                fileSize: file.size,
                mimeType: file.type || 'unknown',
                extension,
                magicType,
                extensionMatchesMagic,
                entropy: Number(entropy.toFixed(3)),
                riskScore,
                riskLevel,
                magicBytes: Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
            },
            warnings
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Falha na análise de integridade'
        };
    }
}

async function computeSHA256(bytes: Uint8Array): Promise<string> {
    const data = new Uint8Array(bytes.byteLength);
    data.set(bytes);
    const digest = await crypto.subtle.digest('SHA-256', data.buffer);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function detectMagic(bytes: Uint8Array): string {
    for (const signature of MAGIC_SIGNATURES) {
        let matches = true;
        for (let i = 0; i < signature.bytes.length; i++) {
            if (bytes[i] !== signature.bytes[i]) {
                matches = false;
                break;
            }
        }
        if (matches) {
            // WEBP precisa do prefixo RIFF e da marca WEBP em offset 8.
            if (signature.type === 'WEBP' && bytes.length > 12) {
                const isWebp =
                    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
                return isWebp ? 'WEBP' : 'RIFF';
            }
            return signature.type;
        }
    }
    return 'UNKNOWN';
}

function extractExtension(name: string): string {
    const dot = name.lastIndexOf('.');
    if (dot === -1) return '';
    return name.slice(dot + 1).toLowerCase();
}

function matchExtensionToMagic(extension: string, magicType: string): boolean {
    if (!extension) return false;
    const map: Record<string, string[]> = {
        JPEG: ['jpg', 'jpeg'],
        PNG: ['png'],
        WEBP: ['webp'],
        GIF: ['gif']
    };
    const valid = map[magicType] || [];
    return valid.includes(extension);
}

function calculateByteEntropy(bytes: Uint8Array): number {
    if (bytes.length === 0) return 0;

    const freq = new Array(256).fill(0);
    for (const b of bytes) {
        freq[b]++;
    }

    let entropy = 0;
    const total = bytes.length;

    for (const count of freq) {
        if (count === 0) continue;
        const p = count / total;
        entropy -= p * Math.log2(p);
    }

    return entropy;
}
