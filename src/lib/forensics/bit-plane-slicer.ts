
/**
 * Bit Plane Slicer Module
 * Decompõe a imagem em seus 8 planos de bits para análise visual
 * Essencial para detectar esteganografia em bits menos significativos (LSB) e manipulações.
 */

export interface BitPlaneResult {
    success: boolean;
    planes?: Array<{ bit: number; image: string }>; // bit 0..7 e dataURL
    error?: string;
}

export async function sliceBitPlanes(file: File): Promise<BitPlaneResult> {
    try {
        const img = await loadImage(file);
        const planes: Array<{ bit: number; image: string }> = [];

        // Dimensões limitadas para performance se a imagem for gigante
        const MAX_DIM = 2000;
        let width = img.width;
        let height = img.height;

        if (width === 0 || height === 0) {
            throw new Error('Dimensões da imagem inválidas (0x0).');
        }

        if (width > MAX_DIM || height > MAX_DIM) {
            const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
            width = Math.max(1, Math.floor(width * ratio));
            height = Math.max(1, Math.floor(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) throw new Error('Falha ao inicializar contexto 2D do navegador.');

        // Desenhar imagem original redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Extrair dados de pixel
        // Pode falhar se tainted (CORS), mas como é File local deve funcionar.
        let originalImageData;
        try {
            originalImageData = ctx.getImageData(0, 0, width, height);
        } catch {
            throw new Error('Erro de segurança (CORS) ou memória ao ler pixels.');
        }

        const originalData = originalImageData.data;

        // Gerar 8 planos (0 a 7)
        // Onde 0 é o LSB (Least Significant Bit) e 7 é o MSB (Most Significant Bit)
        for (let bit = 0; bit < 8; bit++) {
            const planeImageData = ctx.createImageData(width, height);
            const planeData = planeImageData.data;
            const mask = 1 << bit;

            for (let i = 0; i < originalData.length; i += 4) {
                const r = originalData[i];
                const g = originalData[i + 1];
                const b = originalData[i + 2];

                // Verificar se o bit está ativo em QUALQUER canal (R, G ou B)
                const bitSet = (r & mask) || (g & mask) || (b & mask);
                const bitValue = bitSet ? 255 : 0;

                planeData[i] = bitValue;     // R
                planeData[i + 1] = bitValue; // G
                planeData[i + 2] = bitValue; // B
                planeData[i + 3] = 255;      // A (Alpha opaco)
            }

            // Colocar dados no canvas temporário para exportar dataURL
            ctx.putImageData(planeImageData, 0, 0);
            planes.push({
                bit,
                image: canvas.toDataURL('image/png')
            });
        }

        return {
            success: true,
            planes
        };
    } catch (error) {
        console.error('BitPlaneSlicer error:', error);
        return {
            success: false,
            error: error instanceof Error ? `Erro no fatiamento de bits: ${error.message}` : 'Erro desconhecido ao processar planos de bits.'
        };
    }
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Falha ao carregar a imagem. O arquivo pode estar corrompido ou o formato não é suportado pelo navegador.'));
        };
        img.src = objectUrl;
    });
}
