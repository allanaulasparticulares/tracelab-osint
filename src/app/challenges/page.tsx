'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface Challenge {
    id: string;
    title: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
    points: number;
    category: string;
    icon: string;
    color: string;
    completed: boolean;
    hint: string;
    objective: string;
}

type ChallengeCategory = 'metadata' | 'steganography' | 'forensics' | 'multi';

type ChallengeSeed = {
    title: string;
    description: string;
    difficulty: Challenge['difficulty'];
    points: number;
    icon: string;
    color: string;
    hint: string;
    objective: string;
};

const CHALLENGES_PER_CATEGORY = 30;

const CHALLENGE_SEEDS: Record<ChallengeCategory, ChallengeSeed[]> = {
    metadata: [
        {
            title: 'Encontre a Localização',
            description: 'Uma foto foi encontrada em um servidor comprometido. Extraia os metadados GPS e identifique a cidade.',
            difficulty: 'Easy',
            points: 100,
            icon: '📍',
            color: '#10b981',
            hint: 'Procure campos GPSLatitude e GPSLongitude nos metadados EXIF.',
            objective: 'Identificar as coordenadas GPS exatas e a cidade onde a foto foi tirada.',
        },
        {
            title: 'Qual Dispositivo?',
            description: 'Identifique o modelo exato do smartphone usado para tirar esta foto.',
            difficulty: 'Easy',
            points: 100,
            icon: '📱',
            color: '#10b981',
            hint: 'O campo "Make" e "Model" nos dados EXIF revelam o dispositivo.',
            objective: 'Descobrir fabricante e modelo do dispositivo.',
        },
        {
            title: 'Timestamp Cruzado',
            description: 'Correlacione datas de criação e modificação para validar a linha temporal da evidência.',
            difficulty: 'Medium',
            points: 180,
            icon: '🕒',
            color: '#22c55e',
            hint: 'Compare DateTimeOriginal, DateTimeDigitized e DateTime.',
            objective: 'Apontar possíveis contradições temporais nos metadados.',
        },
        {
            title: 'Rastro de Software',
            description: 'Verifique se a imagem passou por edição e identifique o software usado.',
            difficulty: 'Medium',
            points: 190,
            icon: '🧾',
            color: '#16a34a',
            hint: 'Procure campos Software e ProcessingSoftware.',
            objective: 'Determinar se houve pós-processamento da imagem.',
        },
        {
            title: 'Perfil de Origem',
            description: 'Reconstrua o perfil técnico da captura (dispositivo, lente, orientação e contexto).',
            difficulty: 'Hard',
            points: 260,
            icon: '🧩',
            color: '#15803d',
            hint: 'Combine dados de câmera, orientação e exposure.',
            objective: 'Produzir um resumo técnico consistente da origem da imagem.',
        },
    ],
    steganography: [
        {
            title: 'Mensagem Oculta',
            description: 'Uma mensagem secreta foi escondida nesta imagem usando esteganografia LSB. Decodifique a mensagem.',
            difficulty: 'Medium',
            points: 200,
            icon: '🔐',
            color: '#f59e0b',
            hint: 'Use a ferramenta de decode da Steganography Lab sem senha.',
            objective: 'Extrair e ler a mensagem oculta na imagem.',
        },
        {
            title: 'Senha Protegida',
            description: 'Uma mensagem criptografada está oculta. A senha é uma data no formato DDMMYYYY presente nos metadados.',
            difficulty: 'Hard',
            points: 300,
            icon: '🗝️',
            color: '#ef4444',
            hint: 'Extraia metadados primeiro, encontre a data original e use como senha no decode.',
            objective: 'Combinar metadata extraction + steganography decode.',
        },
        {
            title: 'Canal de Cor Suspeito',
            description: 'Detecte em qual canal RGB houve maior alteração para ocultação de dados.',
            difficulty: 'Medium',
            points: 210,
            icon: '🎨',
            color: '#f97316',
            hint: 'Compare distribuição de ruído por canal.',
            objective: 'Identificar o canal predominante de ocultação.',
        },
        {
            title: 'Payload Fragmentado',
            description: 'A carga foi segmentada em múltiplas regiões. Reconstrua a mensagem completa.',
            difficulty: 'Hard',
            points: 320,
            icon: '🧱',
            color: '#dc2626',
            hint: 'Analise padrões repetitivos de bits e sequência de blocos.',
            objective: 'Recompor o payload oculto em ordem correta.',
        },
        {
            title: 'Falso Positivo LSB',
            description: 'Diferencie ruído natural de sinal esteganográfico.',
            difficulty: 'Expert',
            points: 420,
            icon: '🧠',
            color: '#b91c1c',
            hint: 'Use métricas estatísticas e comparação com baseline.',
            objective: 'Concluir tecnicamente se há ocultação real ou apenas ruído.',
        },
    ],
    forensics: [
        {
            title: 'Foto Manipulada',
            description: 'Esta foto de um documento foi alterada. Use ELA para encontrar quais regiões foram editadas.',
            difficulty: 'Medium',
            points: 250,
            icon: '🔬',
            color: '#f59e0b',
            hint: 'Regiões editadas aparecem mais brilhantes no mapa de calor do ELA.',
            objective: 'Identificar pelo menos 2 regiões manipuladas.',
        },
        {
            title: 'Timeline Inconsistente',
            description: 'Os metadados desta imagem contêm contradições temporais. Encontre a inconsistência.',
            difficulty: 'Medium',
            points: 200,
            icon: '⏰',
            color: '#f59e0b',
            hint: 'Compare a data de criação com a data de modificação e o software usado.',
            objective: 'Identificar contradição temporal nos metadados.',
        },
        {
            title: 'Compressão Divergente',
            description: 'Investigue níveis de compressão diferentes em áreas específicas da imagem.',
            difficulty: 'Hard',
            points: 290,
            icon: '🗜️',
            color: '#ea580c',
            hint: 'Observe blocos com intensidade ELA desproporcional.',
            objective: 'Mapear regiões com provável recompressão seletiva.',
        },
        {
            title: 'Borda Sintética',
            description: 'Verifique sinais de recorte/colagem por transições não naturais entre objetos.',
            difficulty: 'Hard',
            points: 310,
            icon: '✂️',
            color: '#fb7185',
            hint: 'Amplie bordas e compare artefatos com o restante da cena.',
            objective: 'Demonstrar indícios técnicos de composição artificial.',
        },
        {
            title: 'Assinatura de Edição Avançada',
            description: 'Analise múltiplas evidências forenses para confirmar alteração de conteúdo crítico.',
            difficulty: 'Expert',
            points: 450,
            icon: '🧪',
            color: '#e11d48',
            hint: 'Cruze ELA, scanner de inconsistências e integridade binária.',
            objective: 'Entregar conclusão forense com nível de confiança justificado.',
        },
    ],
    multi: [
        {
            title: 'Cadeia de Evidências',
            description: 'Analise uma série de 3 imagens conectadas. Cada uma contém uma pista para a próxima.',
            difficulty: 'Hard',
            points: 400,
            icon: '🔗',
            color: '#ef4444',
            hint: 'Comece extraindo metadados da primeira imagem. A pista está no campo de comentários.',
            objective: 'Seguir a cadeia completa de evidências.',
        },
        {
            title: 'Análise Completa',
            description: 'Combine todos os módulos para resolver: metadata, stego, ELA e scanner numa única investigação.',
            difficulty: 'Expert',
            points: 500,
            icon: '🏆',
            color: '#a855f7',
            hint: 'Siga a ordem: Metadata → Scanner → ELA → Stego para resolver o caso.',
            objective: 'Usar todos os 4 módulos para completar a investigação.',
        },
        {
            title: 'Caso Fantasma',
            description: 'Reconstrua a narrativa de um incidente a partir de fragmentos técnicos de múltiplas fontes.',
            difficulty: 'Expert',
            points: 520,
            icon: '👻',
            color: '#9333ea',
            hint: 'Valide cada hipótese com no mínimo duas evidências independentes.',
            objective: 'Produzir timeline e atribuição técnica com coerência completa.',
        },
        {
            title: 'Operação Espelho',
            description: 'Descubra qual imagem é a original e quais foram manipuladas em cascata.',
            difficulty: 'Hard',
            points: 430,
            icon: '🪞',
            color: '#7c3aed',
            hint: 'Use integridade binária e ELA comparativa entre amostras.',
            objective: 'Classificar original, derivadas e etapa provável de manipulação.',
        },
        {
            title: 'Dossiê Final',
            description: 'Monte um laudo técnico com conclusões, limitações e próximos passos investigativos.',
            difficulty: 'Expert',
            points: 600,
            icon: '📁',
            color: '#6d28d9',
            hint: 'Estruture fatos, hipóteses e confiança de forma separada.',
            objective: 'Entregar um relatório investigativo completo e auditável.',
        },
    ],
};

function generateCategoryChallenges(category: ChallengeCategory, count: number): Challenge[] {
    const seeds = CHALLENGE_SEEDS[category];
    return Array.from({ length: count }, (_, index) => {
        const seed = seeds[index % seeds.length];
        const batch = Math.floor(index / seeds.length) + 1;
        const serial = String(index + 1).padStart(2, '0');
        return {
            id: `${category}-${serial}`,
            title: `${seed.title} #${batch}`,
            description: seed.description,
            difficulty: seed.difficulty,
            points: seed.points + Math.floor(index / 3) * 5,
            category,
            icon: seed.icon,
            color: seed.color,
            completed: false,
            hint: seed.hint,
            objective: seed.objective,
        };
    });
}

export default function ChallengesPage() {
    const router = useRouter();
    const [filter, setFilter] = useState<string>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [completedIds, setCompletedIds] = useState<string[]>([]);
    const [completingId, setCompletingId] = useState<string | null>(null);

    const challenges: Challenge[] = useMemo(
        () => [
            ...generateCategoryChallenges('metadata', CHALLENGES_PER_CATEGORY),
            ...generateCategoryChallenges('steganography', CHALLENGES_PER_CATEGORY),
            ...generateCategoryChallenges('forensics', CHALLENGES_PER_CATEGORY),
            ...generateCategoryChallenges('multi', CHALLENGES_PER_CATEGORY),
        ],
        []
    );

    const categories = [
        { id: 'all', label: 'Todos', icon: '🎯' },
        { id: 'metadata', label: 'Metadata', icon: '🔍' },
        { id: 'steganography', label: 'Stego', icon: '🧪' },
        { id: 'forensics', label: 'Forense', icon: '🔬' },
        { id: 'multi', label: 'Multi-Módulo', icon: '🏆' },
    ];

    useEffect(() => {
        const loadSummary = async () => {
            try {
                const res = await fetch('/api/progress/summary', { credentials: 'include' });
                const data = await res.json();
                if (!res.ok || !data?.success || !data?.progress) return;
                const ids = Array.isArray(data.progress.completedChallengeIds) ? data.progress.completedChallengeIds : [];
                setCompletedIds(ids);
            } catch {
                // Segue sem bloqueio caso API indisponível.
            }
        };

        loadSummary();
    }, []);

    const enhancedChallenges = useMemo(
        () =>
            challenges.map((challenge) => ({
                ...challenge,
                completed: completedIds.includes(challenge.id),
            })),
        [challenges, completedIds]
    );

    const filtered = filter === 'all' ? enhancedChallenges : enhancedChallenges.filter(c => c.category === filter);
    const earnedPoints = enhancedChallenges.filter(c => c.completed).reduce((s, c) => s + c.points, 0);

    const completeChallengeAction = async (challenge: Challenge) => {
        if (completedIds.includes(challenge.id)) return;
        setCompletingId(challenge.id);
        try {
            const res = await fetch('/api/progress/challenge/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ challengeId: challenge.id, points: challenge.points }),
            });
            const data = await res.json();
            if (!res.ok || !data?.success) return;

            const ids = Array.isArray(data?.progress?.completedChallengeIds) ? data.progress.completedChallengeIds : [];
            setCompletedIds(ids);
        } finally {
            setCompletingId(null);
        }
    };

    return (
        <div className="min-h-screen grid-background" style={{ background: 'var(--bg-primary)' }}>
            <header className="glass header-hide-mobile" style={{ borderBottom: '1px solid var(--border-primary)', position: 'sticky', top: 0, zIndex: 50 }}>
                <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                            <Image src="/logo_atual.png" alt="Logo" width={48} height={48} />
                        </Link>
                        <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>Treinamento CTF</span>
                    </div>
                </div>
            </header>

            <main className="container" style={{ padding: 'clamp(1rem, 4vw, 1.5rem)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0))' }}>
                <div className="glass" style={{
                    padding: '1.5rem',
                    borderRadius: '1.25rem',
                    marginBottom: '2rem',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(0,0,0,0.3))',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>Operação CTF 🎯</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        Complete missões baseadas em casos reais para ganhar <strong>XP</strong>. Use as ferramentas do Lab para encontrar as respostas.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#00ff88' }}>{earnedPoints}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Seu XP</div>
                        </div>
                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#00d4ff' }}>{completedIds.length}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Missões</div>
                        </div>
                    </div>
                </div>

                <div className="hide-scrollbar" style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setFilter(cat.id)}
                            style={{
                                whiteSpace: 'nowrap',
                                padding: '0.6rem 1.25rem',
                                borderRadius: '1rem',
                                border: '1px solid',
                                borderColor: filter === cat.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                                background: filter === cat.id ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255,255,255,0.05)',
                                color: filter === cat.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            <span>{cat.icon}</span> {cat.label}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filtered.map((ch) => {
                        const isExpanded = expandedId === ch.id;
                        const isBusy = completingId === ch.id;
                        return (
                            <div key={ch.id} className="glass" style={{ borderRadius: '0.75rem', overflow: 'hidden', border: `1px solid ${ch.completed ? '#10b98130' : 'var(--border-primary)'}` }}>
                                <div style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }} onClick={() => setExpandedId(isExpanded ? null : ch.id)}>
                                    <span style={{ fontSize: '2rem' }}>{ch.completed ? '✅' : ch.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{ch.title}</span>
                                            <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: `${ch.color}20`, color: ch.color, fontWeight: 700 }}>{ch.difficulty}</span>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ch.description}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: ch.color }}>{ch.points} pts</div>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border-primary)', paddingTop: '1rem' }}>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>🎯 Objetivo:</strong>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{ch.objective}</p>
                                        </div>
                                        <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', marginBottom: '1rem' }}>
                                            <strong style={{ color: '#f59e0b', fontSize: '0.8rem' }}>💡 Dica:</strong>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{ch.hint}</p>
                                        </div>
                                        {!ch.completed && (
                                            <button className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} onClick={() => completeChallengeAction(ch)} disabled={isBusy}>
                                                {isBusy ? '⏳ Verificando...' : '🚩 Marcar como concluído'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'rgba(0, 212, 255, 0.03)', border: '1px solid rgba(0, 212, 255, 0.15)', borderRadius: '1rem' }}>
                    <h3 style={{ color: '#00e5ff', fontWeight: 800, fontSize: '0.95rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>🛠️ Guia do Operativo</h3>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {[
                            'Combine ferramentas do Lab para encontrar informações ocultas.',
                            'Metadata extraction é a base para quase toda investigação.',
                            'Steganography exige precisão: use as dicas para encontrar chaves.',
                            'XP acumulado desbloqueia novos estatutos no Dashboard.'
                        ].map((m, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <span style={{ color: '#00e5ff' }}>•</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{m}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
