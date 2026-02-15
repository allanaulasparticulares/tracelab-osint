'use client';

import { useEffect, useMemo, useState } from 'react';
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
    const totalPoints = enhancedChallenges.reduce((s, c) => s + c.points, 0);
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
      <header className="glass" style={{ borderBottom: '1px solid var(--border-primary)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(0.75rem, 2vw, 1rem) 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 2vw, 0.75rem)' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <Image src="/logo_atual.png" alt="TraceLab OSINT" width={80} height={80} className="brand-logo" />
            </Link>
            <span className="mono header-title-mobile" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontWeight: 700, color: 'var(--accent-primary)', lineHeight: 1.2 }}>Desafios CTF</span>
          </div>
          <nav className="mobile-nav">
            <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}>Dashboard</Link>
            <Link href="/lab" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}>Lab</Link>
            <Link href="/api/auth/logout" style={{ color: '#ff5dc3', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}>Sair</Link>
          </nav>
        </div>
      </header>

      <main className="container" style={{ padding: 'clamp(1.25rem, 3vw, 2rem) 1rem', paddingBottom: 'calc(64px + 1.5rem + env(safe-area-inset-bottom, 0))' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(1.5rem, 3vw, 2rem)' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.2 }}>🎯 Capture The Flag</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', fontSize: 'clamp(0.85rem, 2vw, 1rem)', lineHeight: 1.5 }}>
            Resolva desafios práticos de análise forense digital. Cada desafio testa habilidades diferentes de OSINT.
          </p>
        </div>

        {/* Score Overview */}
        <div className="glass" style={{ borderRadius: '0.75rem', padding: 'clamp(1.1rem, 3vw, 1.5rem)', marginBottom: 'clamp(1.5rem, 3vw, 2rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 'clamp(0.75rem, 2vw, 1rem)' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="mono" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 700, color: '#00ff88', lineHeight: 1.1 }}>{earnedPoints}</div>
            <div style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.75rem)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Pontos Ganhos</div>
          </div>
          <div style={{ width: '1px', height: 'clamp(30px, 8vw, 40px)', background: 'var(--border-primary)', display: 'none' }} className="md:block" />
          <div style={{ textAlign: 'center' }}>
            <div className="mono" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 700, color: 'var(--text-secondary)', lineHeight: 1.1 }}>{totalPoints}</div>
            <div style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.75rem)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Total Disponível</div>
          </div>
          <div style={{ width: '1px', height: 'clamp(30px, 8vw, 40px)', background: 'var(--border-primary)', display: 'none' }} className="md:block" />
          <div style={{ textAlign: 'center' }}>
            <div className="mono" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 700, color: '#00d4ff', lineHeight: 1.1 }}>{enhancedChallenges.filter(c => c.completed).length}/{enhancedChallenges.length}</div>
            <div style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.75rem)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Completados</div>
          </div>
        </div>

                {/* Category Filter */}
                <div className="scroll-x-container" style={{ marginBottom: '1.5rem' }}>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setFilter(cat.id)}
                            className="snap-center"
                            style={{
                                whiteSpace: 'nowrap', flexShrink: 0,
                                padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid',
                                borderColor: filter === cat.id ? '#00ff88' : 'var(--border-primary)',
                                background: filter === cat.id ? 'rgba(0, 255, 136, 0.1)' : 'transparent',
                                color: filter === cat.id ? '#00ff88' : 'var(--text-secondary)',
                                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                            }}
                        >
                            {cat.icon} {cat.label}
                        </button>
                    ))}
                </div>

                {/* Challenge Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filtered.map((ch) => (
                        <div
                            key={ch.id}
                            className="glass"
                            style={{ borderRadius: '0.75rem', overflow: 'hidden', border: `1px solid ${ch.completed ? '#10b98130' : 'var(--border-primary)'}` }}
                        >
                            <div
                                style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
                                onClick={() => setExpandedId(expandedId === ch.id ? null : ch.id)}
                            >
                                <span style={{ fontSize: '2rem' }}>{ch.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{ch.title}</span>
                                        <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: `${ch.color}20`, color: ch.color, fontWeight: 700 }}>{ch.difficulty}</span>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ch.description}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: ch.color }}>{ch.points} pts</div>
                                    <div style={{ fontSize: '0.7rem', color: ch.completed ? '#10b981' : 'var(--text-muted)', marginTop: '0.15rem' }}>
                                        {ch.completed ? '✅ Completado' : '⏳ Pendente'}
                                    </div>
                                </div>
                                <span style={{ color: 'var(--text-muted)', transform: expandedId === ch.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>▼</span>
                            </div>

                            {expandedId === ch.id && (
                                <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border-primary)', paddingTop: '1rem' }}>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>🎯 Objetivo:</strong>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{ch.objective}</p>
                                    </div>
                                    <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', marginBottom: '1rem' }}>
                                        <strong style={{ color: '#f59e0b', fontSize: '0.8rem' }}>💡 Dica:</strong>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{ch.hint}</p>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                                        <Link href="/lab" className="btn btn-primary" style={{ display: 'inline-flex', padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}>
                                            🧪 Abrir Lab para Resolver
                                        </Link>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}
                                            onClick={() => completeChallengeAction(ch)}
                                            disabled={ch.completed || completingId === ch.id}
                                        >
                                            {ch.completed ? '✅ Concluído' : completingId === ch.id ? '⏳ Salvando...' : 'Marcar como concluído'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Info */}
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '0.75rem' }}>
                    <h3 style={{ color: '#00d4ff', fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>ℹ️ Como Funcionam os Desafios</h3>
                    <div className="responsive-grid-2-tight">
                        {[
                            'Cada desafio testa uma habilidade específica de OSINT',
                            'Use o Lab para analisar arquivos e encontrar respostas',
                            'Dificuldade indica complexidade e quantidade de módulos necessários',
                            'Desafios Expert combinam múltiplas ferramentas numa única investigação',
                        ].map((tip, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                <span style={{ color: '#00d4ff', flexShrink: 0 }}>▸</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

