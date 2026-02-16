'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const modules = [
  {
    icon: '🔍',
    title: 'Metadata Intelligence',
    desc: 'Extração de EXIF, GPS e contexto de privacidade com leitura técnica e explicações educacionais.',
    points: ['GeoINT e localização', 'Histórico de dispositivo', 'Avaliação de risco'],
    color: '#00e5ff'
  },
  {
    icon: '🧪',
    title: 'Steganography Lab',
    desc: 'Demonstração prática de ocultação e extração de mensagens com análise de padrões LSB.',
    points: ['Encode/Decode', 'Scanner de indícios', 'Visualização de alterações'],
    color: '#a855f7'
  },
  {
    icon: '🔬',
    title: 'Forensic Analysis',
    desc: 'ELA, scanner de inconsistências e correlação temporal para investigação de manipulações.',
    points: ['Heatmap de diferenças', 'Triagem de anomalias', 'Raciocínio pericial'],
    color: '#ff00aa'
  }
];

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona para dashboard se ja houver uma sessao ativa
    if (document.cookie.includes('tracelab_session')) {
      router.replace('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen grid-background" style={{ background: 'var(--bg-primary)' }}>
      <header className="glass border-b border-[var(--border-primary)] sticky top-0 z-50">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Image src="/logo_atual.png" alt="TraceLab OSINT" width={80} height={80} className="brand-logo" />
            <div>
              <h1 className="mono" style={{ color: 'var(--accent-primary)', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', fontWeight: 700, lineHeight: 1.2 }}>TraceLab OSINT</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.65rem, 2vw, 0.75rem)', lineHeight: 1.3 }}>Digital Forensics Education</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="container" style={{ padding: '1.5rem 1rem 5rem', position: 'relative', zIndex: 2 }}>
        <section
          className="glass premium-reveal"
          style={{
            borderRadius: 'clamp(0.75rem, 2vw, 1rem)',
            padding: 'clamp(1.25rem, 4vw, 2rem)',
            border: '1px solid rgba(0,229,255,0.2)',
            background:
              'radial-gradient(circle at 10% 20%, rgba(0,229,255,0.11), transparent 38%), radial-gradient(circle at 90% 0%, rgba(168,85,247,0.1), transparent 35%), rgba(16,21,29,0.82)'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', borderRadius: 999, border: '1px solid rgba(0,229,255,0.3)', background: 'rgba(0,229,255,0.08)', marginBottom: '1rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e5ff', boxShadow: '0 0 10px #00e5ff' }} />
                <span className="mono" style={{ color: '#9defff', fontSize: 'clamp(0.65rem, 2vw, 0.75rem)', letterSpacing: '0.02em' }}>PRIVACY-FIRST • CLIENT-SIDE</span>
              </div>

              <h2 style={{ fontSize: 'clamp(1.75rem, 6vw, 3.6rem)', lineHeight: 1.1, marginBottom: '0.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Laboratório prático de <span style={{ color: 'var(--accent-primary)' }}>forense digital</span>
              </h2>

              <p style={{ color: 'var(--text-secondary)', maxWidth: 720, marginBottom: '1.25rem', fontSize: 'clamp(0.9rem, 2.5vw, 1.05rem)', lineHeight: 1.6 }}>
                Analise evidências, descubra inconsistências e entenda como dados vazam em imagens com uma interface educacional direta e técnica.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <Link href="/login" className="btn btn-primary" style={{ padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(1.1rem, 3vw, 1.5rem)', fontSize: 'clamp(0.875rem, 2.2vw, 1rem)' }}>
                  Entrar para Analisar
                </Link>
              </div>

              <div style={{ display: 'flex', gap: 'clamp(0.75rem, 2vw, 1rem)', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: 'clamp(0.7rem, 1.8vw, 0.8rem)' }}>
                <span>✓ Sem upload obrigatório</span>
                <span>✓ Metodologia educacional</span>
                <span>✓ Open source</span>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.7rem' }}>
              {[
                ['Módulos ativos', '7'],
                ['Processamento local', '95%'],
                ['Acesso protegido', 'Passkey']
              ].map(([label, value], idx) => (
                <div key={idx} className="card" style={{ padding: '1rem', borderRadius: '0.8rem' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{label}</div>
                  <div className="mono" style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.35rem' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="premium-reveal premium-delay-1" style={{ marginTop: 'clamp(1.5rem, 4vw, 2rem)' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.6rem)', fontWeight: 700 }}>Módulos de análise</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 0.92rem)', lineHeight: 1.5 }}>Fluxo pensado para investigação e aprendizado progressivo.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem' }}>
            {modules.map((item) => (
              <article key={item.title} className="card premium-card" style={{ borderTop: `3px solid ${item.color}`, borderRadius: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: 'clamp(1.2rem, 3vw, 1.4rem)' }}>{item.icon}</span>
                  <h4 style={{ fontWeight: 700, fontSize: 'clamp(0.95rem, 2.5vw, 1.05rem)' }}>{item.title}</h4>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 0.88rem)', marginBottom: '0.75rem', lineHeight: 1.5 }}>{item.desc}</p>
                <ul style={{ listStyle: 'none', display: 'grid', gap: '0.4rem' }}>
                  {item.points.map((point) => (
                    <li key={point} style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.75rem, 1.8vw, 0.82rem)', lineHeight: 1.4 }}>▸ {point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="glass premium-reveal premium-delay-2" style={{ marginTop: 'clamp(1.5rem, 4vw, 2rem)', borderRadius: '0.75rem', padding: 'clamp(1rem, 3vw, 1.25rem)', border: '1px solid rgba(255, 0, 170, 0.25)' }}>
          <h4 style={{ color: '#ff5dc3', fontWeight: 700, marginBottom: '0.5rem', fontSize: 'clamp(0.95rem, 2.5vw, 1.05rem)' }}>⚖️ Uso Ético</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', lineHeight: 1.6 }}>
            Plataforma exclusivamente educacional. Utilize somente em contexto autorizado e legal.
          </p>
        </section>
      </main>

      <footer className="py-12" style={{ borderTop: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', paddingBottom: 'clamp(3rem, 8vw, 4rem)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', color: 'var(--text-muted)' }}>
            <p className="mono">
              Desenvolvido por:{' '}
              <a
                href="https://allananjos.dev.br/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}
              >
                Allan Anjos
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
