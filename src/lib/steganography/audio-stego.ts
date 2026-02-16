export interface AudioStegoResult {
    success: boolean;
    data?: string;
    audio?: string; // DataURL
    error?: string;
    stats?: {
        capacity: number;
        used: number;
        efficiency: number;
    };
}

/**
 * Universal Audio Steganography using Web Audio API.
 * Supports MP3, OGG, WAV as input. Always outputs WAV to preserve LSB integrity.
 */

export async function encodeAudio(file: File, message: string, password?: string): Promise<AudioStegoResult> {
    try {
        if (typeof window === 'undefined') throw new Error('Ambiente de navegador necessário.');

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        // Get PCM data from the first channel (mono for simplicity)
        const pcmData = audioBuffer.getChannelData(0);

        // Header: [Length (32 bits)]
        const encoder = new TextEncoder();
        const msgBytes = encoder.encode(message);
        const header = new Uint32Array([msgBytes.length]);
        const headerBytes = new Uint8Array(header.buffer);

        const combined = new Uint8Array(4 + msgBytes.length);
        combined.set(headerBytes);
        combined.set(msgBytes, 4);

        if (combined.length * 8 > pcmData.length) {
            throw new Error('Áudio muito curto para esta mensagem.');
        }

        // Stego logic: Modify the LSB of PCM samples
        // PCM floats are -1.0 to 1.0. We convert to 16-bit Int representation for bit manipulation.
        const intData = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            // Map -1..1 to -32768..32767
            intData[i] = Math.max(-32768, Math.min(32767, Math.floor(pcmData[i] * 32768)));
        }

        let bitIdx = 0;
        for (let i = 0; i < combined.length; i++) {
            const byte = combined[i];
            for (let bit = 0; bit < 8; bit++) {
                const bitVal = (byte >> bit) & 1;
                // Modify LSB of the 16-bit sample
                intData[bitIdx] = (intData[bitIdx] & 0xFFFE) | bitVal;
                bitIdx++;
            }
        }

        // Convert back to modified Float32Array for the new AudioBuffer (optional, but let's go straight to WAV)
        const wavBuffer = encodeWAV(intData, audioBuffer.sampleRate);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });

        return {
            success: true,
            audio: URL.createObjectURL(blob),
            stats: {
                capacity: Math.floor(pcmData.length / 8),
                used: combined.length,
                efficiency: (combined.length / (pcmData.length / 8)) * 100
            }
        };

    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Erro na codificação.' };
    }
}

export async function decodeAudio(file: File, password?: string): Promise<AudioStegoResult> {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const pcmData = audioBuffer.getChannelData(0);

        // Convert back to 16-bit to get original LSBs
        const intData = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            intData[i] = Math.max(-32768, Math.min(32767, Math.floor(pcmData[i] * 32768)));
        }

        // Extract header
        const headerBytes = new Uint8Array(4);
        let bitIdx = 0;
        for (let i = 0; i < 4; i++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
                byte |= (intData[bitIdx] & 1) << bit;
                bitIdx++;
            }
            headerBytes[i] = byte;
        }

        const msgLen = new Uint32Array(headerBytes.buffer)[0];
        if (msgLen === 0 || msgLen > 1000000 || bitIdx + msgLen * 8 > intData.length) {
            throw new Error('Nenhuma mensagem detectada ou formato incompatível.');
        }

        const msgBytes = new Uint8Array(msgLen);
        for (let i = 0; i < msgLen; i++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
                byte |= (intData[bitIdx] & 1) << bit;
                bitIdx++;
            }
            msgBytes[i] = byte;
        }

        return { success: true, data: new TextDecoder().decode(msgBytes) };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Falha na decodificação.' };
    }
}

/**
 * Simple WAV Encoder Utility
 */
function encodeWAV(samples: Int16Array, sampleRate: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    for (let i = 0; i < samples.length; i++) {
        view.setInt16(44 + i * 2, samples[i], true);
    }

    return buffer;
}
