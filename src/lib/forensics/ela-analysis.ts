/**
 * Error Level Analysis (ELA) - Detecção de Manipulação em Imagens
 * 
 * ELA funciona recomprimindo a imagem e analisando diferenças de compressão.
 * Áreas editadas tendem a ter níveis de erro diferentes das originais.
 * 
 * ⚠️ IMPORTANTE: ELA é um INDICADOR, não uma prova definitiva.
 * Falsos positivos podem ocorrer com:
 * - Imagens altamente comprimidas
 * - Áreas com alto contraste
 * - Texto ou bordas nítidas
 */

export interface ELAResult {
    success: boolean;
    elaImage?: string; // Base64 da imagem ELA
    heatmap?: string; // Base64 do mapa de calor
    suspiciousRegions?: SuspiciousRegion[];
    overallScore: number; // 0-100, quanto maior mais suspeito
    analysis: {
        maxDifference: number;
        avgDifference: number;
        stdDeviation: number;
        compressionQuality: number;
    };
    warnings: string[];
    explanation: string;
}

export interface SuspiciousRegion {
    x: number;
    y: number;
    width: number;
    height: number;
    score: number;
    reason: string;
}

/**
 * Executa análise ELA em uma imagem JPEG
 */
export async function performELA(
    imageFile: File,
    quality: number = 90
): Promise<ELAResult> {
    try {
        const warnings: string[] = [];

        // Verificar se é JPEG
        if (!imageFile.type.includes('jpeg') && !imageFile.type.includes('jpg')) {
            warnings.push('⚠️ ELA funciona melhor com imagens JPEG');
        }

        // Carregar imagem original
        const originalImage = await loadImageToCanvas(imageFile);
        const originalData = originalImage.ctx.getImageData(
            0, 0, originalImage.canvas.width, originalImage.canvas.height
        );

        // Recomprimir imagem com qualidade específica
        const recompressedBlob = await recompressImage(originalImage.canvas, quality);
        const recompressedImage = await loadImageToCanvas(
            new File([recompressedBlob], 'recompressed.jpg', { type: 'image/jpeg' })
        );
        const recompressedData = recompressedImage.ctx.getImageData(
            0, 0, recompressedImage.canvas.width, recompressedImage.canvas.height
        );

        // Calcular diferenças pixel a pixel
        const elaCanvas = document.createElement('canvas');
        elaCanvas.width = originalImage.canvas.width;
        elaCanvas.height = originalImage.canvas.height;
        const elaCtx = elaCanvas.getContext('2d');
        if (!elaCtx) throw new Error('Canvas context not available');

        const elaData = elaCtx.createImageData(elaCanvas.width, elaCanvas.height);
        const differences: number[] = [];
        let maxDiff = 0;
        let totalDiff = 0;

        for (let i = 0; i < originalData.data.length; i += 4) {
            // Calcular diferença absoluta para cada canal RGB
            const rDiff = Math.abs(originalData.data[i] - recompressedData.data[i]);
            const gDiff = Math.abs(originalData.data[i + 1] - recompressedData.data[i + 1]);
            const bDiff = Math.abs(originalData.data[i + 2] - recompressedData.data[i + 2]);

            const avgDiff = (rDiff + gDiff + bDiff) / 3;
            differences.push(avgDiff);
            totalDiff += avgDiff;
            maxDiff = Math.max(maxDiff, avgDiff);

            // Amplificar diferenças para visualização (multiplicar por fator)
            const amplificationFactor = 15;
            const amplified = Math.min(255, avgDiff * amplificationFactor);

            elaData.data[i] = amplified;     // R
            elaData.data[i + 1] = amplified; // G
            elaData.data[i + 2] = amplified; // B
            elaData.data[i + 3] = 255;       // A
        }

        elaCtx.putImageData(elaData, 0, 0);

        // Gerar mapa de calor (colorido)
        const heatmapCanvas = generateHeatmap(differences, elaCanvas.width, elaCanvas.height);

        // Detectar regiões suspeitas
        const suspiciousRegions = detectSuspiciousRegions(
            differences,
            elaCanvas.width,
            elaCanvas.height
        );

        // Calcular estatísticas
        const avgDifference = totalDiff / differences.length;
        const variance = differences.reduce((sum, diff) =>
            sum + Math.pow(diff - avgDifference, 2), 0
        ) / differences.length;
        const stdDeviation = Math.sqrt(variance);

        // Calcular score geral (0-100)
        const overallScore = calculateManipulationScore(
            maxDiff,
            avgDifference,
            stdDeviation,
            suspiciousRegions.length
        );

        // Gerar explicação
        const explanation = generateExplanation(overallScore, suspiciousRegions.length);

        // Adicionar avisos contextuais
        if (maxDiff < 10) {
            warnings.push('ℹ️ Diferenças muito baixas - imagem pode ser original ou altamente comprimida');
        }
        if (maxDiff > 100) {
            warnings.push('⚠️ Diferenças muito altas - possível manipulação ou artefatos de compressão');
        }
        if (suspiciousRegions.length > 10) {
            warnings.push('🔍 Múltiplas regiões suspeitas detectadas');
        }

        return {
            success: true,
            elaImage: elaCanvas.toDataURL('image/png'),
            heatmap: heatmapCanvas.toDataURL('image/png'),
            suspiciousRegions,
            overallScore,
            analysis: {
                maxDifference: maxDiff,
                avgDifference,
                stdDeviation,
                compressionQuality: quality
            },
            warnings,
            explanation
        };

    } catch (error) {
        return {
            success: false,
            overallScore: 0,
            analysis: {
                maxDifference: 0,
                avgDifference: 0,
                stdDeviation: 0,
                compressionQuality: quality
            },
            warnings: [error instanceof Error ? error.message : 'Erro desconhecido'],
            explanation: 'Falha ao executar análise ELA'
        };
    }
}

/**
 * Gera mapa de calor colorido das diferenças
 */
function generateHeatmap(
    differences: number[],
    width: number,
    height: number
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const imageData = ctx.createImageData(width, height);
    let maxDiff = 0;
    for (const diff of differences) {
        if (diff > maxDiff) maxDiff = diff;
    }
    const normalizedMax = maxDiff || 1;

    for (let i = 0; i < differences.length; i++) {
        const normalized = differences[i] / normalizedMax;
        const color = getHeatmapColor(normalized);

        const pixelIndex = i * 4;
        imageData.data[pixelIndex] = color.r;
        imageData.data[pixelIndex + 1] = color.g;
        imageData.data[pixelIndex + 2] = color.b;
        imageData.data[pixelIndex + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

/**
 * Converte valor normalizado (0-1) em cor de mapa de calor
 */
function getHeatmapColor(value: number): { r: number; g: number; b: number } {
    // Azul (baixo) -> Verde -> Amarelo -> Vermelho (alto)
    if (value < 0.25) {
        return { r: 0, g: Math.floor(value * 4 * 255), b: 255 };
    } else if (value < 0.5) {
        return { r: 0, g: 255, b: Math.floor((1 - (value - 0.25) * 4) * 255) };
    } else if (value < 0.75) {
        return { r: Math.floor((value - 0.5) * 4 * 255), g: 255, b: 0 };
    } else {
        return { r: 255, g: Math.floor((1 - (value - 0.75) * 4) * 255), b: 0 };
    }
}

/**
 * Detecta regiões com padrões suspeitos
 */
function detectSuspiciousRegions(
    differences: number[],
    width: number,
    height: number
): SuspiciousRegion[] {
    const regions: SuspiciousRegion[] = [];
    const threshold = calculateAdaptiveThreshold(differences);
    const blockSize = 32; // Blocos de 32x32 pixels

    for (let y = 0; y < height - blockSize; y += blockSize) {
        for (let x = 0; x < width - blockSize; x += blockSize) {
            const blockScore = calculateBlockScore(differences, x, y, blockSize, width);

            if (blockScore > threshold) {
                regions.push({
                    x,
                    y,
                    width: blockSize,
                    height: blockSize,
                    score: blockScore,
                    reason: blockScore > threshold * 2
                        ? 'Diferença extrema detectada'
                        : 'Padrão de compressão inconsistente'
                });
            }
        }
    }

    // Mesclar regiões adjacentes
    return mergeAdjacentRegions(regions);
}

/**
 * Calcula threshold adaptativo baseado na distribuição
 */
function calculateAdaptiveThreshold(differences: number[]): number {
    const sorted = [...differences].sort((a, b) => a - b);
    const percentile95 = sorted[Math.floor(sorted.length * 0.95)];
    return percentile95 * 1.5;
}

/**
 * Calcula score de um bloco de pixels
 */
function calculateBlockScore(
    differences: number[],
    x: number,
    y: number,
    blockSize: number,
    width: number
): number {
    let sum = 0;
    let count = 0;

    for (let by = 0; by < blockSize; by++) {
        for (let bx = 0; bx < blockSize; bx++) {
            const index = (y + by) * width + (x + bx);
            if (index < differences.length) {
                sum += differences[index];
                count++;
            }
        }
    }

    return count > 0 ? sum / count : 0;
}

/**
 * Mescla regiões adjacentes
 */
function mergeAdjacentRegions(regions: SuspiciousRegion[]): SuspiciousRegion[] {
    // Implementação simplificada - retorna top 5 regiões mais suspeitas
    return regions
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}

/**
 * Calcula score geral de manipulação (0-100)
 */
function calculateManipulationScore(
    maxDiff: number,
    avgDiff: number,
    stdDev: number,
    regionCount: number
): number {
    let score = 0;

    // Fator 1: Diferença máxima
    score += Math.min(40, (maxDiff / 255) * 100 * 0.4);

    // Fator 2: Desvio padrão (inconsistência)
    score += Math.min(30, (stdDev / 50) * 30);

    // Fator 3: Número de regiões suspeitas
    score += Math.min(30, regionCount * 6);

    return Math.min(100, Math.round(score));
}

/**
 * Gera explicação contextual
 */
function generateExplanation(score: number, regionCount: number): string {
    if (score < 30) {
        return '✅ Baixa probabilidade de manipulação. A imagem apresenta padrões de compressão consistentes.';
    } else if (score < 60) {
        return `⚠️ Probabilidade moderada de manipulação. ${regionCount} região(ões) com padrões inconsistentes detectada(s). Isso pode indicar edição ou simplesmente artefatos de compressão múltipla.`;
    } else {
        return `🚨 Alta probabilidade de manipulação. Múltiplas inconsistências detectadas. ATENÇÃO: ELA não é prova definitiva - áreas com alto contraste, texto ou bordas também podem gerar alertas.`;
    }
}

// Funções auxiliares

async function loadImageToCanvas(file: File): Promise<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
}> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Canvas context not available'));
                return;
            }
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(objectUrl);
            resolve({ canvas, ctx });
        };
        img.onerror = (error) => {
            URL.revokeObjectURL(objectUrl);
            reject(error);
        };
        img.src = objectUrl;
    });
}

async function recompressImage(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to recompress image'));
            },
            'image/jpeg',
            quality / 100
        );
    });
}
