import Image from 'next/image';
import Link from 'next/link';

export default function ThemePage() {
  return (
    <div className="min-h-screen grid-background" style={{ background: 'var(--bg-primary)' }}>
      <header className="glass" style={{ borderBottom: '1px solid var(--border-primary)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <Image src="/logo_atual.png" alt="TraceLab OSINT" width={80} height={80} className="brand-logo" />
            <div>
              <span className="mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-primary)' }}>Theme Showcase</span>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>UI Kit Base</p>
            </div>
          </Link>
          <nav className="mobile-nav">
            <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>Dashboard</Link>
            <Link href="/lab" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>Lab</Link>
            <Link href="/api/auth/logout" style={{ color: '#ff5dc3', textDecoration: 'none', fontSize: '0.875rem' }}>Sair</Link>
          </nav>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 1.5rem' }}>
        <section className="glass" style={{ borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem' }}>Botões</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button type="button" className="btn btn-primary">Primário</button>
            <button type="button" className="btn btn-secondary">Secundário</button>
          </div>
        </section>

        <section className="glass" style={{ borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem' }}>Inputs</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <input className="input" placeholder="Nome de usuário" />
            <input className="input" placeholder="Query OSINT" />
          </div>
        </section>

        <section className="glass" style={{ borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem' }}>Cards</h2>
          <div className="responsive-grid-2">
            <article className="card">
              <h3 style={{ marginBottom: '0.35rem' }}>Evidence Nodes</h3>
              <p style={{ color: 'var(--text-secondary)' }}>412 nós correlacionados.</p>
            </article>
            <article className="card">
              <h3 style={{ marginBottom: '0.35rem' }}>Anomaly Score</h3>
              <p style={{ color: 'var(--text-secondary)' }}>89% de confiança.</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

