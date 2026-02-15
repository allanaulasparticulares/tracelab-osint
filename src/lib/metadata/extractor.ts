/**
 * Metadata Extraction Module
 * Extrai EXIF, IPTC, XMP, GPS e outros metadados de arquivos
 */

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
        const arrayBuffer = await file.arrayBuffer();
        const dataView = new DataView(arrayBuffer);

        const metadata: MetadataCollection = {
            basic: {
                fileName: file.name,
                fileSize: formatFileSize(file.size),
                fileType: file.type,
                lastModified: new Date(file.lastModified).toISOString()
            }
        };

        // Detectar tipo de arquivo e extrair metadados específicos
        if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg')) {
            await extractJPEGMetadata(dataView, metadata);
        } else if (file.type === 'image/png') {
            await extractPNGMetadata(dataView, metadata);
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
 * Extrai metadados EXIF de JPEG
 */
async function extractJPEGMetadata(dataView: DataView, metadata: MetadataCollection) {
    // Verificar assinatura JPEG
    if (dataView.getUint16(0) !== 0xFFD8) {
        throw new Error('Arquivo JPEG inválido');
    }

    let offset = 2;
    const exifData: Record<string, unknown> = {};
    const gpsData: GPSData = {};
    const deviceInfo: DeviceInfo = {};
    const softwareInfo: SoftwareInfo = {};
    const timestamps: TimestampInfo = {};

    while (offset < dataView.byteLength) {
        const marker = dataView.getUint16(offset);
        offset += 2;

        // APP1 marker (EXIF)
        if (marker === 0xFFE1) {
            const segmentLength = dataView.getUint16(offset);
            offset += 2;

            // Verificar assinatura EXIF
            const exifSignature = String.fromCharCode(
                dataView.getUint8(offset),
                dataView.getUint8(offset + 1),
                dataView.getUint8(offset + 2),
                dataView.getUint8(offset + 3)
            );

            if (exifSignature === 'Exif') {
                offset += 6; // Pular "Exif\0\0"

                // Determinar endianness
                const tiffHeader = dataView.getUint16(offset);
                const littleEndian = tiffHeader === 0x4949;

                // Extrair tags EXIF
                const ifdOffset = dataView.getUint32(offset + 4, littleEndian);
                parseIFD(dataView, offset + ifdOffset, littleEndian, exifData, gpsData, deviceInfo, softwareInfo, timestamps);
            }

            offset += segmentLength - 2;
        } else if (marker === 0xFFDA) {
            // Start of scan - fim dos metadados
            break;
        } else {
            // Pular outros segmentos
            const segmentLength = dataView.getUint16(offset);
            offset += segmentLength;
        }
    }

    metadata.exif = exifData;
    if (Object.keys(gpsData).length > 0) metadata.gps = gpsData;
    if (Object.keys(deviceInfo).length > 0) metadata.device = deviceInfo;
    if (Object.keys(softwareInfo).length > 0) metadata.software = softwareInfo;
    if (Object.keys(timestamps).length > 0) metadata.timestamps = timestamps;
}

/**
 * Parse IFD (Image File Directory) EXIF
 */
function parseIFD(
    dataView: DataView,
    offset: number,
    littleEndian: boolean,
    exifData: Record<string, unknown>,
    gpsData: GPSData,
    deviceInfo: DeviceInfo,
    softwareInfo: SoftwareInfo,
    timestamps: TimestampInfo
) {
    const numEntries = dataView.getUint16(offset, littleEndian);
    offset += 2;

    for (let i = 0; i < numEntries; i++) {
        const tag = dataView.getUint16(offset, littleEndian);
        const type = dataView.getUint16(offset + 2, littleEndian);
        const count = dataView.getUint32(offset + 4, littleEndian);
        const valueOffset = dataView.getUint32(offset + 8, littleEndian);

        // Mapear tags conhecidas
        const tagName = EXIF_TAGS[tag] || `Unknown_${tag}`;
        let value: unknown;

        // Extrair valor baseado no tipo
        if (type === 2) { // ASCII string
            value = readString(dataView, offset + 8, count);
        } else if (type === 3) { // Short
            value = dataView.getUint16(offset + 8, littleEndian);
        } else if (type === 4) { // Long
            value = dataView.getUint32(offset + 8, littleEndian);
        } else if (type === 5) { // Rational
            const numerator = dataView.getUint32(valueOffset, littleEndian);
            const denominator = dataView.getUint32(valueOffset + 4, littleEndian);
            value = denominator !== 0 ? numerator / denominator : 0;
        }

        // Categorizar metadados
        if (GPS_TAGS[tag]) {
            const gpsField = GPS_FIELD_MAP[tag];
            if (gpsField) {
                gpsData[gpsField] = value;
            } else {
                gpsData[GPS_TAGS[tag]] = value;
            }
        } else if (DEVICE_TAGS.includes(tag)) {
            const deviceField = DEVICE_FIELD_MAP[tag];
            if (deviceField) {
                deviceInfo[deviceField] = value;
            } else {
                deviceInfo[tagName] = value;
            }
        } else if (SOFTWARE_TAGS.includes(tag)) {
            const softwareField = SOFTWARE_FIELD_MAP[tag];
            if (softwareField) {
                softwareInfo[softwareField] = value;
            } else {
                softwareInfo[tagName] = value;
            }
        } else if (TIMESTAMP_TAGS.includes(tag)) {
            const timestampField = TIMESTAMP_FIELD_MAP[tag];
            if (timestampField) {
                timestamps[timestampField] = value;
            } else {
                timestamps[tagName] = value;
            }
        } else {
            exifData[tagName] = value;
        }

        offset += 12;
    }
}

/**
 * Extrai metadados de PNG
 */
async function extractPNGMetadata(dataView: DataView, metadata: MetadataCollection) {
    // Verificar assinatura PNG
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) {
        if (dataView.getUint8(i) !== signature[i]) {
            throw new Error('Arquivo PNG inválido');
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

/**
 * Remove metadados de imagem
 */
export async function stripMetadata(file: File): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const img = await loadImage(file);
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
        }, 'image/png');
    });
}

// Funções auxiliares

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
        };
        img.onerror = (error) => {
            URL.revokeObjectURL(objectUrl);
            reject(error);
        };
        img.src = objectUrl;
    });
}

function readString(dataView: DataView, offset: number, length: number): string {
    let str = '';
    for (let i = 0; i < length - 1; i++) {
        const char = dataView.getUint8(offset + i);
        if (char === 0) break;
        str += String.fromCharCode(char);
    }
    return str;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Tags EXIF conhecidas
const EXIF_TAGS: Record<number, string> = {
    0x010F: 'Make',
    0x0110: 'Model',
    0x0112: 'Orientation',
    0x011A: 'XResolution',
    0x011B: 'YResolution',
    0x0128: 'ResolutionUnit',
    0x0131: 'Software',
    0x0132: 'DateTime',
    0x013B: 'Artist',
    0x8298: 'Copyright',
    0x829A: 'ExposureTime',
    0x829D: 'FNumber',
    0x8822: 'ExposureProgram',
    0x8827: 'ISOSpeedRatings',
    0x9003: 'DateTimeOriginal',
    0x9004: 'DateTimeDigitized',
    0xA002: 'PixelXDimension',
    0xA003: 'PixelYDimension',
    0xA420: 'ImageUniqueID'
};

const GPS_TAGS: Record<number, string> = {
    0x0001: 'GPSLatitudeRef',
    0x0002: 'GPSLatitude',
    0x0003: 'GPSLongitudeRef',
    0x0004: 'GPSLongitude',
    0x0005: 'GPSAltitudeRef',
    0x0006: 'GPSAltitude',
    0x0007: 'GPSTimeStamp'
};

const GPS_FIELD_MAP: Partial<Record<number, keyof GPSData>> = {
    0x0002: 'latitude',
    0x0004: 'longitude',
    0x0006: 'altitude',
    0x0007: 'timestamp'
};

const DEVICE_FIELD_MAP: Partial<Record<number, keyof DeviceInfo>> = {
    0x010F: 'make',
    0x0110: 'model',
    0xA420: 'serialNumber'
};

const SOFTWARE_FIELD_MAP: Partial<Record<number, keyof SoftwareInfo>> = {
    0x0131: 'software'
};

const TIMESTAMP_FIELD_MAP: Partial<Record<number, keyof TimestampInfo>> = {
    0x0132: 'modified',
    0x9003: 'original',
    0x9004: 'digitized'
};

const DEVICE_TAGS = [0x010F, 0x0110, 0xA420];
const SOFTWARE_TAGS = [0x0131];
const TIMESTAMP_TAGS = [0x0132, 0x9003, 0x9004];
