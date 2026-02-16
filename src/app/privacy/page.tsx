'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function PrivacyPage() {
    const sections = [
        {
            title: '🎯 Nossa Filosofia',
            content: 'O TraceLab OSINT foi desenvolvido com privacy-by-design. Acreditamos que uma plataforma educacional sobre segurança digital deve ser exemplo de respeito à privacidade do usuário.',
        },
        {
            title: '💻 Processamento 100% Client-Side',
            items: [
                'Todos os arquivos são processados exclusivamente no seu navegador',
                'Nenhuma imagem ou arquivo é enviado a servidores externos',
                'Análises de metadados, ELA e esteganografia ocorrem localmente',
                'Código-fonte aberto para verificação independente',
            ],
        },
        {
            title: '🔐 Dados que Coletamos',
            items: [
                'Usuários registrados: email (hash), nome (opcional), progresso de aprendizado',
                'Sessões anônimas: UUID v4 temporário, expirado em 24h, nenhum dado pessoal',
                'Logs agregados: apenas contadores anônimos de uso (não individuais)',
                'Nenhum cookie de rastreamento, analytics de terceiros, ou fingerprinting',
            ],
        },
        {
            title: '🗑️ Política de Retenção',
            items: [
                'Sessões anônimas são auto-deletadas após 24 horas',
                'Contas podem ser excluídas a qualquer momento, com remoção total dos dados',
                'Backups encriptados são retidos por no máximo 30 dias',
                'Dados de progresso nunca são compartilhados com terceiros',
            ],
        },
        {
            title: '🛡️ Medidas de Segurança',
            items: [
                'Senhas hasheadas com bcrypt (12 rounds)',
                'Tokens JWT com expiração e refresh tokens',
                'Proteção contra brute-force (5 tentativas / 15 min)',
                'Sanitização de inputs e proteção contra XSS/CSRF',
                'HTTPS obrigatório em produção',
            ],
        },
        {
            title: '⚖️ Uso Ético',
            content: 'Esta plataforma é exclusivamente educacional. Proibimos o uso para vigilância não autorizada, invasão de privacidade, ou qualquer atividade ilegal. Reservamo-nos o direito de revogar acesso em caso de uso indevido.',
        },
    ];

    return (
        <div className="min-h-screen grid-background" style={{ background: 'var(--bg-primary)' }}>
            <header className="glass" style={{ borderBottom: '1px solid var(--border-primary)', position: 'sticky', top: 0, zIndex: 50 }}>
                <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
                    <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                        <Image src="/logo_atual.png" alt="TraceLab OSINT" width={80} height={80} className="brand-logo" />
                        <span className="mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>TraceLab</span>
                    </Link>
                    <nav className="mobile-nav">
                        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>Dashboard</Link>
                        <Link href="/lab" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>Lab</Link>
                        <Link href="/api/auth/logout" style={{ color: '#ff5dc3', textDecoration: 'none', fontSize: '0.875rem' }}>Sair</Link>
                    </nav>
                </div>
            </header>

            <main className="container" style={{ maxWidth: '800px', padding: '2rem 1.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>🛡️ Política de Privacidade</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Última atualização: Fevereiro 2026</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {sections.map((section, i) => (
                        <div key={i} className="glass" style={{ borderRadius: '0.75rem', padding: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>{section.title}</h2>
                            {section.content && (
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{section.content}</p>
                            )}
                            {section.items && (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {section.items.map((item, j) => (
                                        <li key={j} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                            <span style={{ color: '#00ff88', flexShrink: 0 }}>▸</span>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ textAlign: 'center', marginTop: '3rem', padding: '1.5rem', background: 'rgba(0, 255, 136, 0.05)', border: '1px solid rgba(0, 255, 136, 0.2)', borderRadius: '0.75rem' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.7 }}>
                        &quot;Com grande poder vem grande responsabilidade.&quot;<br />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Use o conhecimento para proteger, não para prejudicar.</span>
                    </p>
                </div>

                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <Link href="/" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textDecoration: 'none' }}>← Voltar para a Home</Link>
                </div>
            </main>
        </div>
    );
}

