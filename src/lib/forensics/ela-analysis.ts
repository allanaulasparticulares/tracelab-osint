/**
 * Error Level Analysis (ELA) - Detecção de Manipulação em Imagens
 * 
 * ELA funciona recomprimindo a imagem e analisando diferenças de compressão.
 * Áreas editadas tendem a ter níveis de erro diferentes das originais.
 */

export interface ELAResult {
    success: boolean;
    elaImage?: string;
    heatmap?: string;
    suspiciousRegions?: SuspiciousRegion[];
    overallScore: number;
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
    quality: number = 90,
    onProgress?: (percent: number) => void
): Promise<ELAResult> {
    try {
        if (onProgress) onProgress(0);
        const warnings: string[] = [];

        if (!imageFile.type.includes('jpeg') && !imageFile.type.includes('jpg')) {
            warnings.push('⚠️ ELA funciona melhor com imagens JPEG');
        }

        const originalImage = await loadImageToCanvas(imageFile);
        const originalData = originalImage.ctx.getImageData(
            0, 0, originalImage.canvas.width, originalImage.canvas.height
        );

        if (onProgress) onProgress(20);

        const recompressedBlob = await recompressImage(originalImage.canvas, quality);
        const recompressedImage = await loadImageToCanvas(
            new File([recompressedBlob], 'recompressed.jpg', { type: 'image/jpeg' })
        );
        const recompressedData = recompressedImage.ctx.getImageData(
            0, 0, recompressedImage.canvas.width, recompressedImage.canvas.height
        );

        if (onProgress) onProgress(40);

        const elaCanvas = document.createElement('canvas');
        elaCanvas.width = originalImage.canvas.width;
        elaCanvas.height = originalImage.canvas.height;
        const elaCtx = elaCanvas.getContext('2d');
        if (!elaCtx) throw new Error('Canvas context not available');

        const elaData = elaCtx.createImageData(elaCanvas.width, elaCanvas.height);
        const differences: number[] = [];
        let maxDiff = 0;
        let totalDiff = 0;

        const totalPixels = originalData.data.length / 4;
        for (let i = 0; i < originalData.data.length; i += 4) {
            const rDiff = Math.abs(originalData.data[i] - recompressedData.data[i]);
            const gDiff = Math.abs(originalData.data[i + 1] - recompressedData.data[i + 1]);
            const bDiff = Math.abs(originalData.data[i + 2] - recompressedData.data[i + 2]);

            const avgDiff = (rDiff + gDiff + bDiff) / 3;
            differences.push(avgDiff);
            totalDiff += avgDiff;
            maxDiff = Math.max(maxDiff, avgDiff);

            const amplificationFactor = 15;
            const amplified = Math.min(255, avgDiff * amplificationFactor);

            elaData.data[i] = amplified;
            elaData.data[i + 1] = amplified;
            elaData.data[i + 2] = amplified;
            elaData.data[i + 3] = 255;

            if (onProgress && (i / 4) % 100000 === 0) {
                onProgress(Math.round(40 + ((i / 4) / totalPixels) * 40));
            }
        }

        elaCtx.putImageData(elaData, 0, 0);
        if (onProgress) onProgress(85);

        const heatmapCanvas = generateHeatmap(differences, elaCanvas.width, elaCanvas.height);
        const suspiciousRegions = detectSuspiciousRegions(differences, elaCanvas.width, elaCanvas.height);

        const avgDifference = totalDiff / differences.length;
        const variance = differences.reduce((sum, diff) => sum + Math.pow(diff - avgDifference, 2), 0) / differences.length;
        const stdDeviation = Math.sqrt(variance);

        const overallScore = calculateManipulationScore(maxDiff, avgDifference, stdDeviation, suspiciousRegions.length);
        const explanation = generateExplanation(overallScore, suspiciousRegions.length);

        if (maxDiff < 10) warnings.push('ℹ️ Diferenças muito baixas - imagem pode ser original');
        if (maxDiff > 100) warnings.push('⚠️ Diferenças muito altas - possível manipulação');
        if (suspiciousRegions.length > 10) warnings.push('🔍 Múltiplas regiões suspeitas detectadas');

        if (onProgress) onProgress(100);

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
            analysis: { maxDifference: 0, avgDifference: 0, stdDeviation: 0, compressionQuality: quality },
            warnings: [error instanceof Error ? error.message : 'Erro desconhecido'],
            explanation: 'Falha ao executar análise ELA'
        };
    }
}

function generateHeatmap(differences: number[], width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const imageData = ctx.createImageData(width, height);
    let maxDiff = 0;
    for (const diff of differences) if (diff > maxDiff) maxDiff = diff;
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

function getHeatmapColor(value: number): { r: number; g: number; b: number } {
    if (value < 0.25) return { r: 0, g: Math.floor(value * 4 * 255), b: 255 };
    if (value < 0.5) return { r: 0, g: 255, b: Math.floor((1 - (value - 0.25) * 4) * 255) };
    if (value < 0.75) return { r: Math.floor((value - 0.5) * 4 * 255), g: 255, b: 0 };
    return { r: 255, g: Math.floor((1 - (value - 0.75) * 4) * 255), b: 0 };
}

function detectSuspiciousRegions(differences: number[], width: number, height: number): SuspiciousRegion[] {
    const regions: SuspiciousRegion[] = [];
    const threshold = calculateAdaptiveThreshold(differences);
    const blockSize = 32;

    for (let y = 0; y < height - blockSize; y += blockSize) {
        for (let x = 0; x < width - blockSize; x += blockSize) {
            const blockScore = calculateBlockScore(differences, x, y, blockSize, width);
            if (blockScore > threshold) {
                regions.push({
                    x, y, width: blockSize, height: blockSize, score: blockScore,
                    reason: blockScore > threshold * 2 ? 'Diferença extrema' : 'Padrão inconsistente'
                });
            }
        }
    }
    return regions.sort((a, b) => b.score - a.score).slice(0, 5);
}

function calculateAdaptiveThreshold(differences: number[]): number {
    const sorted = [...differences].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)] * 1.5;
}

function calculateBlockScore(differences: number[], x: number, y: number, blockSize: number, width: number): number {
    let sum = 0, count = 0;
    for (let by = 0; by < blockSize; by++) {
        for (let bx = 0; bx < blockSize; bx++) {
            const index = (y + by) * width + (x + bx);
            if (index < differences.length) { sum += differences[index]; count++; }
        }
    }
    return count > 0 ? sum / count : 0;
}

function calculateManipulationScore(maxDiff: number, avgDiff: number, stdDev: number, regionCount: number): number {
    let score = 0;
    score += Math.min(40, (maxDiff / 255) * 100 * 0.4);
    score += Math.min(30, (stdDev / 50) * 30);
    score += Math.min(30, regionCount * 6);
    return Math.min(100, Math.round(score));
}

function generateExplanation(score: number, regionCount: number): string {
    if (score < 30) return '✅ Baixa probabilidade de manipulação.';
    if (score < 60) return `⚠️ Probabilidade moderada (${regionCount} regiões suspeitas).`;
    return `🚨 Alta probabilidade de manipulação detectada!`;
}

async function loadImageToCanvas(file: File): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error('Canvas context error')); return; }
            ctx.drawImage(img, 0, 0); URL.revokeObjectURL(objectUrl);
            resolve({ canvas, ctx });
        };
        img.onerror = (e) => { URL.revokeObjectURL(objectUrl); reject(e); };
        img.src = objectUrl;
    });
}

async function recompressImage(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob); else reject(new Error('Recompression error'));
        }, 'image/jpeg', quality / 100);
    });
}
