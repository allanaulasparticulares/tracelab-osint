/**
 * Metadata Extraction Module
 * Extrai EXIF, IPTC, XMP, GPS e outros metadados de arquivos
 */

// @ts-expect-error piexifjs types are missing
import piexif from 'piexifjs';

export interface MetadataResult {
    success: boolean;
    metadata?: MetadataCollection;
    error?: string;
    riskLevel?: 'low' | 'medium' | 'high';
    warnings?: string[];
}

export interface MetadataCollection {
    basic: Record<string, unknown>;
    exif?: Record<string, unknown>;
    gps?: GPSData;
    device?: DeviceInfo;
    software?: SoftwareInfo;
    timestamps?: TimestampInfo;
    iptc?: Record<string, unknown>;
    xmp?: Record<string, unknown>;
    raw?: Record<string, unknown>; // Para debug ou dados não categorizados
}

export interface GPSData {
    [key: string]: unknown;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    timestamp?: string;
    accuracy?: string;
}

export interface DeviceInfo {
    [key: string]: unknown;
    make?: string;
    model?: string;
    serialNumber?: string;
    lensModel?: string;
}

export interface SoftwareInfo {
    [key: string]: unknown;
    software?: string;
    version?: string;
    editHistory?: string[];
}

export interface TimestampInfo {
    [key: string]: unknown;
    created?: string;
    modified?: string;
    digitized?: string;
    original?: string;
}

/**
 * Extrai metadados de imagens (JPEG, PNG, WEBP)
 */
export async function extractImageMetadata(file: File): Promise<MetadataResult> {
    try {
        const metadata: MetadataCollection = {
            basic: {
                fileName: file.name,
                fileSize: formatFileSize(file.size),
                fileType: file.type,
                lastModified: new Date(file.lastModified).toISOString()
            }
        };

        // Detectar tipo de arquivo e extrair metadados específicos
        if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
            await extractJPEGMetadata(file, metadata);
        } else if (file.type === 'image/png') {
            await extractPNGMetadata(file, metadata);
        }

        // Calcular nível de risco
        const { riskLevel, warnings } = assessPrivacyRisk(metadata);

        return {
            success: true,
            metadata,
            riskLevel,
            warnings
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao extrair metadados'
        };
    }
}

/**
 * Extrai metadados EXIF de JPEG usando piexifjs
 */
async function extractJPEGMetadata(file: File, metadata: MetadataCollection) {
    const dataUrl = await fileToDataURL(file);

    try {
        const exifObj = piexif.load(dataUrl);
        const exifData: Record<string, unknown> = {};
        const gpsData: GPSData = {};
        const deviceInfo: DeviceInfo = {};
        const softwareInfo: SoftwareInfo = {};
        const timestamps: TimestampInfo = {};

        // Helper para processar tags
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const processTags = (ifd: string, tags: Record<string, any>) => {
            for (const tag in tags) {
                const tagId = parseInt(tag);
                const value = tags[tag];

                // Tenta obter o nome da tag do piexifjs
                let tagName = 'Unknown';
                if (piexif.TAGS[ifd] && piexif.TAGS[ifd][tagId]) {
                    tagName = piexif.TAGS[ifd][tagId].name;
                }

                // Processar valores específicos
                if (ifd === 'GPS') {
                    // Mapeamento específico de GPS
                    if (tagName === 'GPSLatitude') {
                        const ref = tags[piexif.TAGS.GPS.GPSLatitudeRef] || 'N';
                        gpsData.latitude = convertDMSToDD(value, ref);
                    } else if (tagName === 'GPSLongitude') {
                        const ref = tags[piexif.TAGS.GPS.GPSLongitudeRef] || 'E';
                        gpsData.longitude = convertDMSToDD(value, ref);
                    } else if (tagName === 'GPSAltitude') {
                        gpsData.altitude = Array.isArray(value) && value.length === 2 ? value[0] / value[1] : value;
                    } else if (tagName !== 'GPSLatitudeRef' && tagName !== 'GPSLongitudeRef') {
                        // Outros campos GPS
                        gpsData[tagName] = formatValue(value);
                    }
                } else {
                    const formattedValue = formatValue(value);
                    exifData[tagName] = formattedValue;

                    // Categorizar
                    if (tagName === 'Make') deviceInfo.make = String(formattedValue);
                    if (tagName === 'Model') deviceInfo.model = String(formattedValue);
                    if (tagName === 'BodySerialNumber' || tagName === 'CameraOwnerName') deviceInfo.serialNumber = String(formattedValue);
                    if (tagName === 'LensModel') deviceInfo.lensModel = String(formattedValue);

                    if (tagName === 'Software') softwareInfo.software = String(formattedValue);

                    if (tagName === 'DateTime') timestamps.modified = String(formattedValue);
                    if (tagName === 'DateTimeOriginal') timestamps.original = String(formattedValue);
                    if (tagName === 'DateTimeDigitized') timestamps.digitized = String(formattedValue);
                }
            }
        };

        if (exifObj['0th']) processTags('0th', exifObj['0th']);
        if (exifObj['Exif']) processTags('Exif', exifObj['Exif']);
        if (exifObj['GPS']) processTags('GPS', exifObj['GPS']);
        if (exifObj['1st']) processTags('1st', exifObj['1st']);

        metadata.exif = exifData;
        if (Object.keys(gpsData).length > 0) metadata.gps = gpsData;
        if (Object.keys(deviceInfo).length > 0) metadata.device = deviceInfo;
        if (Object.keys(softwareInfo).length > 0) metadata.software = softwareInfo;
        if (Object.keys(timestamps).length > 0) metadata.timestamps = timestamps;

    } catch (e) {
        console.warn('Erro pexifjs or no exif:', e);
        // Fallback or just ignore if no exif
    }
}

function formatValue(val: unknown): unknown {
    if (val === null || val === undefined) return val;
    // Racional: [numerador, denominador]
    if (Array.isArray(val) && val.length === 2 && typeof val[0] === 'number' && typeof val[1] === 'number') {
        return val[1] !== 0 ? val[0] / val[1] : 0;
    }
    // String com null char
    if (typeof val === 'string') {
        // Remover null bytes e trim
        return val.replace(/\0/g, '').trim();
    }
    return val;
}

function convertDMSToDD(dms: number[][], ref: string): number {
    if (!Array.isArray(dms) || dms.length !== 3) return 0;

    const d = dms[0][0] / dms[0][1];
    const m = dms[1][0] / dms[1][1];
    const s = dms[2][0] / dms[2][1];

    let dd = d + m / 60 + s / 3600;

    if (ref === 'S' || ref === 'W') {
        dd = dd * -1;
    }

    return dd;
}

function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


/**
 * Extrai metadados de PNG (mantido implementação manual pois piexifjs foca em JPEG)
 */
async function extractPNGMetadata(file: File, metadata: MetadataCollection) {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    // Verificar assinatura PNG
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) {
        if (dataView.getUint8(i) !== signature[i]) {
            // Não falhar silenciosamente, mas também não é crítico
            return;
        }
    }

    let offset = 8;
    const pngData: Record<string, unknown> = {};

    while (offset < dataView.byteLength) {
        const chunkLength = dataView.getUint32(offset);
        const chunkType = String.fromCharCode(
            dataView.getUint8(offset + 4),
            dataView.getUint8(offset + 5),
            dataView.getUint8(offset + 6),
            dataView.getUint8(offset + 7)
        );

        if (chunkType === 'tEXt' || chunkType === 'iTXt' || chunkType === 'zTXt') {
            const textData = readPNGTextChunk(dataView, offset + 8, chunkLength);
            Object.assign(pngData, textData);
        }

        offset += chunkLength + 12; // length + type + data + CRC

        if (chunkType === 'IEND') break;
    }

    metadata.exif = pngData;
}

/**
 * Lê chunk de texto PNG
 */
function readPNGTextChunk(dataView: DataView, offset: number, length: number): Record<string, string> {
    const result: Record<string, string> = {};
    let keyword = '';
    let i = 0;

    // Ler keyword (null-terminated)
    while (i < length) {
        const char = dataView.getUint8(offset + i);
        if (char === 0) break;
        keyword += String.fromCharCode(char);
        i++;
    }

    i++; // Pular null terminator

    // Ler texto
    let text = '';
    while (i < length) {
        text += String.fromCharCode(dataView.getUint8(offset + i));
        i++;
    }

    result[keyword] = text;
    return result;
}

/**
 * Avalia risco de privacidade baseado nos metadados
 */
function assessPrivacyRisk(metadata: MetadataCollection): {
    riskLevel: 'low' | 'medium' | 'high';
    warnings: string[];
} {
    const warnings: string[] = [];
    let riskScore = 0;

    // GPS = alto risco
    if (metadata.gps && (metadata.gps.latitude || metadata.gps.longitude)) {
        riskScore += 40;
        warnings.push('⚠️ Coordenadas GPS encontradas - localização exata exposta');
    }

    // Informações do dispositivo
    if (metadata.device?.make || metadata.device?.model) {
        riskScore += 15;
        warnings.push('📱 Informações do dispositivo presentes');
    }

    // Número de série
    if (metadata.device?.serialNumber) {
        riskScore += 25;
        warnings.push('🔢 Número de série do dispositivo exposto');
    }

    // Software de edição
    if (metadata.software?.software) {
        riskScore += 10;
        warnings.push('💻 Software de edição identificado');
    }

    // Histórico de edição
    if (metadata.software?.editHistory && metadata.software.editHistory.length > 0) {
        riskScore += 20;
        warnings.push('📝 Histórico de edições presente');
    }

    // Timestamps detalhados
    if (metadata.timestamps?.original || metadata.timestamps?.digitized) {
        riskScore += 10;
        warnings.push('🕐 Timestamps detalhados presentes');
    }

    // Determinar nível de risco
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore >= 50) {
        riskLevel = 'high';
    } else if (riskScore >= 25) {
        riskLevel = 'medium';
    } else {
        riskLevel = 'low';
    }

    return { riskLevel, warnings };
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
