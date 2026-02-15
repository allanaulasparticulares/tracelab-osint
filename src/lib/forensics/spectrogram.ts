export interface SpectrogramResult {
    success: boolean;
    duration: number;
    spectrogram?: string; // DataURL
    error?: string;
}

interface ExtendedWindow extends Window {
    webkitAudioContext: typeof AudioContext;
    webkitOfflineAudioContext: typeof OfflineAudioContext;
}

export async function generateSpectrogram(file: File): Promise<SpectrogramResult> {
    try {
        if (typeof window === 'undefined') throw new Error('Environment requires browser');

        const arrayBuffer = await file.arrayBuffer();
        const win = window as unknown as ExtendedWindow;
        const audioCtx = new (window.AudioContext || win.webkitAudioContext)();

        // Decode audio
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const duration = audioBuffer.duration;

        // Limit duration to avoid crash
        if (duration > 600) throw new Error('Arquivo muito longo (máx 10min).');

        // Setup Offline Context
        const offlineCtx = new (window.OfflineAudioContext || win.webkitOfflineAudioContext)(
            1, // mono
            audioBuffer.length,
            audioBuffer.sampleRate
        );

        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;

        const fftSize = 2048;
        const analyser = offlineCtx.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = 0;

        source.connect(analyser);
        analyser.connect(offlineCtx.destination);

        const freqBinCount = analyser.frequencyBinCount; // 1024

        // Resolution: 50 px/sec
        const pixelsPerSecond = 50;
        const width = Math.ceil(duration * pixelsPerSecond);
        const height = 512;

        const columns: Uint8Array[] = [];

        // Schedule Sampling
        const step = 1 / pixelsPerSecond;
        // Pre-fill columns to ensure order
        for (let i = 0; i < width; i++) columns.push(new Uint8Array(freqBinCount));

        for (let i = 0; i < width; i++) {
            const t = i * step;
            if (t >= duration) break;

            // Schedule suspension to capture improvements
            offlineCtx.suspend(t).then(() => {
                const array = new Uint8Array(freqBinCount);
                analyser.getByteFrequencyData(array);
                columns[i] = array;
            }).then(() => offlineCtx.resume());
        }

        source.start(0);
        await offlineCtx.startRendering();

        // Draw
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context failed');

        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let x = 0; x < Math.min(width, columns.length); x++) {
            const freqData = columns[x];
            // freqData has 1024 bins, mapped to 512 height (2 bins per pixel approximation)

            for (let y = 0; y < height; y++) {
                // Map y (0=top=HighFreq, 512=bottom=Low)
                // We want bottom=low freq. 
                // y=511 -> bin 0. y=0 -> bin 1023.
                const bin = Math.floor((1 - y / height) * (freqBinCount - 1));
                const value = freqData[bin];

                // Heatmap Color: Black -> Blue -> Cyan -> White
                let r = 0, g = 0, b = 0;
                if (value < 50) {
                    b = value * 2;
                } else if (value < 150) {
                    b = 255;
                    g = (value - 50) * 2.55;
                } else {
                    b = 255;
                    g = 255;
                    r = (value - 150) * 2.55;
                }

                const index = (y * width + x) * 4;
                data[index] = r;
                data[index + 1] = g;
                data[index + 2] = b;
                data[index + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        return {
            success: true,
            duration,
            spectrogram: canvas.toDataURL('image/png')
        };

    } catch (e) {
        console.error(e);
        return {
            success: false,
            duration: 0,
            error: e instanceof Error ? e.message : 'Erro na geração do espectrograma.'
        };
    }
}
