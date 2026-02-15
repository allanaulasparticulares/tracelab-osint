/**
 * Bit Plane Slicer Module
 * Decompõe a imagem em seus 8 planos de bits para análise visual
 */

export interface BitPlaneResult {
    success: boolean;
    planes?: Array<{ bit: number; image: string }>;
    error?: string;
}

export async function sliceBitPlanes(
    file: File,
    onProgress?: (percent: number) => void
): Promise<BitPlaneResult> {
    try {
        if (onProgress) onProgress(0);
        const img = await loadImage(file);
        const planes: Array<{ bit: number; image: string }> = [];

        const MAX_DIM = 2000;
        let width = img.width;
        let height = img.height;

        if (width === 0 || height === 0) throw new Error('Dimensões inválidas.');

        if (width > MAX_DIM || height > MAX_DIM) {
            const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
            width = Math.max(1, Math.floor(width * ratio));
            height = Math.max(1, Math.floor(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Falha no contexto 2D.');

        ctx.drawImage(img, 0, 0, width, height);

        let originalImageData;
        try {
            originalImageData = ctx.getImageData(0, 0, width, height);
        } catch {
            throw new Error('Erro de memória ao ler pixels.');
        }

        const originalData = originalImageData.data;

        for (let bit = 0; bit < 8; bit++) {
            const planeImageData = ctx.createImageData(width, height);
            const planeData = planeImageData.data;
            const mask = 1 << bit;

            for (let i = 0; i < originalData.length; i += 4) {
                const r = originalData[i];
                const g = originalData[i + 1];
                const b = originalData[i + 2];

                const bitSet = (r & mask) || (g & mask) || (b & mask);
                const bitValue = bitSet ? 255 : 0;

                planeData[i] = bitValue;
                planeData[i + 1] = bitValue;
                planeData[i + 2] = bitValue;
                planeData[i + 3] = 255;
            }

            ctx.putImageData(planeImageData, 0, 0);
            planes.push({ bit, image: canvas.toDataURL('image/png') });

            if (onProgress) {
                onProgress(Math.round(((bit + 1) / 8) * 100));
                // Yield to keep UI responsive
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        return { success: true, planes };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao processar planos de bits.'
        };
    }
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Falha ao carregar imagem.')); };
        img.src = objectUrl;
    });
}
