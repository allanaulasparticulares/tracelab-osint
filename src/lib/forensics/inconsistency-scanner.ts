/**
 * Metadata Inconsistency Scanner
 * 
 * Cruza diferentes fontes de metadados para detectar inconsistências
 * que podem indicar manipulação, falsificação ou anomalias.
 * 
 * OSINT é correlação - este módulo ensina raciocínio analítico.
 */

import { MetadataCollection } from '../metadata/extractor';

export interface InconsistencyReport {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    score: number; // 0-100
    inconsistencies: Inconsistency[];
    timeline: TimelineEvent[];
    recommendations: string[];
    educationalNotes: string[];
}

export interface Inconsistency {
    type: 'temporal' | 'geospatial' | 'device' | 'software' | 'logical';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
    evidence: string[];
    explanation: string;
    mitigation?: string;
}

export interface TimelineEvent {
    timestamp: Date;
    source: string;
    event: string;
    confidence: 'high' | 'medium' | 'low';
}

/**
 * Analisa metadados em busca de inconsistências
 */
export function scanInconsistencies(
    metadata: MetadataCollection,
    fileStats?: { created: Date; modified: Date }
): InconsistencyReport {
    const inconsistencies: Inconsistency[] = [];
    const timeline: TimelineEvent[] = [];
    const recommendations: string[] = [];
    const educationalNotes: string[] = [];

    // 1. Análise Temporal
    const temporalIssues = analyzeTemporalInconsistencies(metadata, fileStats);
    inconsistencies.push(...temporalIssues.inconsistencies);
    timeline.push(...temporalIssues.timeline);

    // 2. Análise Geoespacial
    const geoIssues = analyzeGeospatialInconsistencies(metadata);
    inconsistencies.push(...geoIssues);

    // 3. Análise de Dispositivo vs Software
    const deviceIssues = analyzeDeviceSoftwareInconsistencies(metadata);
    inconsistencies.push(...deviceIssues);

    // 4. Análise Lógica
    const logicalIssues = analyzeLogicalInconsistencies(metadata);
    inconsistencies.push(...logicalIssues);

    // Calcular score geral
    const score = calculateInconsistencyScore(inconsistencies);

    // Determinar risco geral
    const overallRisk = determineRiskLevel(score, inconsistencies);

    // Gerar recomendações
    recommendations.push(...generateRecommendations(inconsistencies, metadata));

    // Adicionar notas educacionais
    educationalNotes.push(...generateEducationalNotes(inconsistencies));

    return {
        overallRisk,
        score,
        inconsistencies,
        timeline: timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
        recommendations,
        educationalNotes
    };
}

/**
 * Analisa inconsistências temporais
 */
function analyzeTemporalInconsistencies(
    metadata: MetadataCollection,
    fileStats?: { created: Date; modified: Date }
): { inconsistencies: Inconsistency[]; timeline: TimelineEvent[] } {
    const inconsistencies: Inconsistency[] = [];
    const timeline: TimelineEvent[] = [];

    const timestamps = metadata.timestamps;
    if (!timestamps) return { inconsistencies, timeline };

    // Extrair timestamps
    const dates: { [key: string]: Date | null } = {
        original: parseExifDate(timestamps.original),
        digitized: parseExifDate(timestamps.digitized),
        modified: parseExifDate(timestamps.modified),
        fileCreated: fileStats?.created || null,
        fileModified: fileStats?.modified || null
    };

    // Construir timeline
    Object.entries(dates).forEach(([source, date]) => {
        if (date) {
            timeline.push({
                timestamp: date,
                source: formatSource(source),
                event: formatEvent(source),
                confidence: source.startsWith('file') ? 'medium' : 'high'
            });
        }
    });

    // Verificar: Data original deve ser anterior à digitizada
    if (dates.original && dates.digitized && dates.original > dates.digitized) {
        inconsistencies.push({
            type: 'temporal',
            severity: 'warning',
            title: 'Data Original Posterior à Digitalização',
            description: 'A data original da foto é posterior à data de digitalização.',
            evidence: [
                `Data Original: ${dates.original.toISOString()}`,
                `Data Digitizada: ${dates.digitized.toISOString()}`
            ],
            explanation: 'Isso pode indicar que os metadados foram alterados manualmente ou que o relógio do dispositivo estava incorreto.',
            mitigation: 'Verifique o histórico de edição e compare com outras fontes.'
        });
    }

    // Verificar: Data de criação do arquivo vs EXIF
    if (dates.fileCreated && dates.original) {
        const diffDays = Math.abs(
            (dates.fileCreated.getTime() - dates.original.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays > 365) {
            inconsistencies.push({
                type: 'temporal',
                severity: 'warning',
                title: 'Grande Divergência entre Data EXIF e Data do Arquivo',
                description: `Diferença de ${Math.round(diffDays)} dias entre a data original EXIF e a data de criação do arquivo.`,
                evidence: [
                    `EXIF Original: ${dates.original.toISOString()}`,
                    `Arquivo Criado: ${dates.fileCreated.toISOString()}`
                ],
                explanation: 'Isso é normal se o arquivo foi transferido, baixado ou copiado. Porém, pode indicar manipulação se combinado com outras inconsistências.',
                mitigation: 'Investigue a origem do arquivo e histórico de transferências.'
            });
        }
    }

    // Verificar: Timestamps futuros
    const now = new Date();
    Object.entries(dates).forEach(([source, date]) => {
        if (date && date > now) {
            inconsistencies.push({
                type: 'temporal',
                severity: 'critical',
                title: 'Data no Futuro Detectada',
                description: `${formatSource(source)} está no futuro.`,
                evidence: [`${formatSource(source)}: ${date.toISOString()}`],
                explanation: 'Relógio do dispositivo estava incorreto ou metadados foram manipulados.',
                mitigation: 'Alta probabilidade de manipulação ou erro de configuração.'
            });
        }
    });

    // Verificar: Modificação antes da criação
    if (dates.fileCreated && dates.fileModified && dates.fileModified < dates.fileCreated) {
        inconsistencies.push({
            type: 'temporal',
            severity: 'critical',
            title: 'Arquivo Modificado Antes de Ser Criado',
            description: 'Data de modificação é anterior à data de criação do arquivo.',
            evidence: [
                `Criado: ${dates.fileCreated.toISOString()}`,
                `Modificado: ${dates.fileModified.toISOString()}`
            ],
            explanation: 'Isso é fisicamente impossível e indica manipulação de timestamps do sistema de arquivos.',
            mitigation: 'Forte indicador de adulteração.'
        });
    }

    return { inconsistencies, timeline };
}

/**
 * Analisa inconsistências geoespaciais
 */
function analyzeGeospatialInconsistencies(metadata: MetadataCollection): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];
    const gps = metadata.gps;
    const timestamps = metadata.timestamps;

    if (!gps || !gps.latitude || !gps.longitude) return inconsistencies;

    // Verificar coordenadas válidas
    if (Math.abs(gps.latitude) > 90 || Math.abs(gps.longitude) > 180) {
        inconsistencies.push({
            type: 'geospatial',
            severity: 'critical',
            title: 'Coordenadas GPS Inválidas',
            description: 'As coordenadas GPS estão fora dos limites válidos.',
            evidence: [
                `Latitude: ${gps.latitude}`,
                `Longitude: ${gps.longitude}`
            ],
            explanation: 'Latitude deve estar entre -90 e 90, longitude entre -180 e 180.',
            mitigation: 'Dados GPS corrompidos ou fabricados.'
        });
    }

    // Verificar coordenadas nulas (0, 0) - Golfo da Guiné
    if (gps.latitude === 0 && gps.longitude === 0) {
        inconsistencies.push({
            type: 'geospatial',
            severity: 'warning',
            title: 'Coordenadas GPS em Null Island',
            description: 'GPS aponta para (0, 0) - localização padrão quando GPS falha.',
            evidence: ['Latitude: 0', 'Longitude: 0'],
            explanation: 'Isso geralmente indica que o GPS não conseguiu obter sinal, mas os metadados foram salvos mesmo assim.',
            mitigation: 'Desconsidere a localização GPS.'
        });
    }

    // Verificar timezone vs GPS (se houver timestamp)
    if (timestamps?.original && gps.latitude && gps.longitude) {
        const estimatedTimezone = estimateTimezoneFromCoordinates(gps.latitude, gps.longitude);
        const exifDate = parseExifDate(timestamps.original);

        if (exifDate) {
            const exifTimezone = exifDate.getTimezoneOffset() / -60;
            const diff = Math.abs(estimatedTimezone - exifTimezone);

            if (diff > 2) {
                inconsistencies.push({
                    type: 'geospatial',
                    severity: 'info',
                    title: 'Possível Divergência de Fuso Horário',
                    description: `Fuso horário do timestamp (${exifTimezone}) não corresponde à localização GPS (${estimatedTimezone}).`,
                    evidence: [
                        `Localização: ${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}`,
                        `Fuso estimado: UTC${estimatedTimezone >= 0 ? '+' : ''}${estimatedTimezone}`
                    ],
                    explanation: 'Isso pode ser normal se o dispositivo estava configurado para outro fuso ou se a foto foi tirada durante viagem.',
                    mitigation: 'Verifique se há histórico de viagens ou configurações manuais de fuso.'
                });
            }
        }
    }

    return inconsistencies;
}

/**
 * Analisa inconsistências entre dispositivo e software
 */
function analyzeDeviceSoftwareInconsistencies(metadata: MetadataCollection): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];
    const device = metadata.device;
    const software = metadata.software;

    if (!device && !software) return inconsistencies;

    // Verificar combinações impossíveis
    if (device?.make && software?.software) {
        const make = device.make.toLowerCase();
        const soft = software.software.toLowerCase();

        // iPhone com software Android
        if (make.includes('apple') && soft.includes('android')) {
            inconsistencies.push({
                type: 'device',
                severity: 'critical',
                title: 'Combinação Impossível: Dispositivo vs Software',
                description: 'Dispositivo Apple com software Android detectado.',
                evidence: [
                    `Fabricante: ${device.make}`,
                    `Software: ${software.software}`
                ],
                explanation: 'Isso é tecnicamente impossível e indica metadados falsificados.',
                mitigation: 'Alta probabilidade de manipulação intencional.'
            });
        }

        // Android com iOS
        if (make.includes('samsung') && soft.includes('ios')) {
            inconsistencies.push({
                type: 'device',
                severity: 'critical',
                title: 'Combinação Impossível: Dispositivo vs Software',
                description: 'Dispositivo Android com iOS detectado.',
                evidence: [
                    `Fabricante: ${device.make}`,
                    `Software: ${software.software}`
                ],
                explanation: 'Isso é tecnicamente impossível e indica metadados falsificados.',
                mitigation: 'Alta probabilidade de manipulação intencional.'
            });
        }
    }

    // Detectar software de edição profissional
    const softwareName = software?.software;
    if (softwareName) {
        const editingSoftware = [
            'photoshop', 'gimp', 'lightroom', 'affinity',
            'pixelmator', 'capture one', 'darktable'
        ];

        const hasEditingSoftware = editingSoftware.some(s =>
            softwareName.toLowerCase().includes(s)
        );

        if (hasEditingSoftware) {
            inconsistencies.push({
                type: 'software',
                severity: 'info',
                title: 'Software de Edição Profissional Detectado',
                description: `Imagem foi processada com ${softwareName}.`,
                evidence: [`Software: ${softwareName}`],
                explanation: 'A imagem foi editada com software profissional. Isso não indica necessariamente manipulação maliciosa, mas confirma que a imagem foi alterada.',
                mitigation: 'Investigue o tipo de edições realizadas (ajustes de cor, recortes, etc).'
            });
        }
    }

    return inconsistencies;
}

/**
 * Analisa inconsistências lógicas gerais
 */
function analyzeLogicalInconsistencies(metadata: MetadataCollection): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];

    // Verificar ausência suspeita de metadados
    const hasMinimalMetadata =
        !metadata.exif &&
        !metadata.gps &&
        !metadata.device &&
        !metadata.software;

    if (hasMinimalMetadata) {
        inconsistencies.push({
            type: 'logical',
            severity: 'warning',
            title: 'Metadados Extremamente Limitados',
            description: 'Arquivo possui pouquíssimos metadados.',
            evidence: ['Ausência de EXIF, GPS, informações de dispositivo e software'],
            explanation: 'Isso pode indicar que os metadados foram removidos intencionalmente (sanitização) ou que a imagem foi capturada/gerada de forma não convencional.',
            mitigation: 'Verifique se há sinais de processamento ou conversão de formato.'
        });
    }

    return inconsistencies;
}

// Funções auxiliares

function parseExifDate(dateString?: string): Date | null {
    if (!dateString) return null;

    // Formato EXIF: "YYYY:MM:DD HH:MM:SS"
    const match = dateString.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (!match) return null;

    const [, year, month, day, hour, minute, second] = match;
    return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
    );
}

function estimateTimezoneFromCoordinates(lat: number, lon: number): number {
    // Estimativa simplificada: 15 graus de longitude ≈ 1 hora
    return Math.round(lon / 15);
}

function formatSource(source: string): string {
    const map: { [key: string]: string } = {
        original: 'EXIF Original',
        digitized: 'EXIF Digitalizado',
        modified: 'EXIF Modificado',
        fileCreated: 'Sistema de Arquivos (Criação)',
        fileModified: 'Sistema de Arquivos (Modificação)'
    };
    return map[source] || source;
}

function formatEvent(source: string): string {
    const map: { [key: string]: string } = {
        original: 'Foto capturada',
        digitized: 'Imagem digitalizada',
        modified: 'Metadados modificados',
        fileCreated: 'Arquivo criado no sistema',
        fileModified: 'Arquivo modificado'
    };
    return map[source] || source;
}

function calculateInconsistencyScore(inconsistencies: Inconsistency[]): number {
    let score = 0;

    inconsistencies.forEach(inc => {
        if (inc.severity === 'critical') score += 30;
        else if (inc.severity === 'warning') score += 15;
        else score += 5;
    });

    return Math.min(100, score);
}

function determineRiskLevel(
    score: number,
    inconsistencies: Inconsistency[]
): 'low' | 'medium' | 'high' | 'critical' {
    const hasCritical = inconsistencies.some(i => i.severity === 'critical');

    if (hasCritical || score >= 70) return 'critical';
    if (score >= 40) return 'high';
    if (score >= 20) return 'medium';
    return 'low';
}

function generateRecommendations(
    inconsistencies: Inconsistency[],
    metadata: MetadataCollection
): string[] {
    const recommendations: string[] = [];

    if (inconsistencies.length === 0) {
        recommendations.push('✅ Nenhuma inconsistência detectada. Metadados parecem coerentes.');
        return recommendations;
    }

    const hasTemporal = inconsistencies.some(i => i.type === 'temporal');
    const hasGeo = inconsistencies.some(i => i.type === 'geospatial');
    const hasCritical = inconsistencies.some(i => i.severity === 'critical');

    if (hasCritical) {
        recommendations.push('🚨 Inconsistências críticas detectadas - alta probabilidade de manipulação');
        recommendations.push('🔍 Recomenda-se análise forense adicional (ELA, análise de histogramas)');
    }

    if (hasTemporal) {
        recommendations.push('🕐 Verifique a linha do tempo completa do arquivo');
        recommendations.push('📋 Compare com outras fontes ou testemunhas');
    }

    if (hasGeo) {
        recommendations.push('🌍 Valide a localização GPS com outras evidências');
        recommendations.push('🗺️ Use ferramentas de GeoINT para confirmar contexto geográfico');
    }

    if (metadata.software?.software) {
        recommendations.push('💻 Investigue o histórico de edição no software identificado');
    }

    recommendations.push('📊 Combine esta análise com ELA e análise de histogramas para conclusão mais robusta');

    return recommendations;
}

function generateEducationalNotes(inconsistencies: Inconsistency[]): string[] {
    const notes: string[] = [];

    notes.push('📚 OSINT é sobre correlação de dados - uma única inconsistência raramente é conclusiva');
    notes.push('🧠 Sempre considere explicações alternativas antes de concluir manipulação');
    notes.push('⚖️ Metadados podem ser alterados por razões legítimas (privacidade, correção de erros)');

    if (inconsistencies.some(i => i.type === 'temporal')) {
        notes.push('🕐 Timestamps podem ser afetados por fusos horários, transferências de arquivos e sincronização de relógio');
    }

    if (inconsistencies.some(i => i.type === 'geospatial')) {
        notes.push('🌍 GPS pode ter precisão variável (5-50m) e pode falhar em ambientes fechados');
    }

    return notes;
}
