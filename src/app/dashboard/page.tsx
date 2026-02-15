'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function DashboardPage() {
  const [userName, setUserName] = useState(() => {
    if (typeof window === 'undefined') return 'Investigador';
    const storedName = window.localStorage.getItem('tracelab_user_name');
    const storedEmail = window.localStorage.getItem('tracelab_user_email');
    const cookieName = readCookie('tracelab_user_name');

    if (storedName && storedName.trim() && storedName.trim().toLowerCase() !== 'investigador') {
      return storedName.trim();
    }
    if (cookieName && cookieName.trim()) {
      return cookieName.trim();
    }
    if (storedEmail) {
      return storedEmail.split('@')[0];
    }
    return 'Investigador';
  });
  const [stats, setStats] = useState({
    totalAnalyses: 0, metadataScans: 0, stegoTests: 0,
    elaAnalyses: 0, scannerRuns: 0, challengesCompleted: 0, learningScore: 0,
  });
  const [completedChallengeIds, setCompletedChallengeIds] = useState<string[]>([]);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const res = await fetch('/api/progress/summary', { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data?.success || !data?.progress) return;

        const progress = data.progress as {
          totalAnalyses: number;
          metadataScans: number;
          stegoTests: number;
          elaAnalyses: number;
          scannerRuns: number;
          challengesCompleted: number;
          learningScore: number;
          completedChallengeIds?: string[];
        };
        const profileName = String(data?.userName || '').trim();
        if (profileName) {
          setUserName(profileName);
          window.localStorage.setItem('tracelab_user_name', profileName);
          document.cookie = `tracelab_user_name=${encodeURIComponent(profileName)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        }

        setStats({
          totalAnalyses: progress.totalAnalyses || 0,
          metadataScans: progress.metadataScans || 0,
          stegoTests: progress.stegoTests || 0,
          elaAnalyses: progress.elaAnalyses || 0,
          scannerRuns: progress.scannerRuns || 0,
          challengesCompleted: progress.challengesCompleted || 0,
          learningScore: progress.learningScore || 0,
        });
        setCompletedChallengeIds(Array.isArray(progress.completedChallengeIds) ? progress.completedChallengeIds : []);
      } catch {
        // Dashboard segue com fallback local.
      }
    };

    loadSummary();
  }, []);

  const periodGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const tools = [
    { name: 'Metadata Intelligence', icon: '🔍', href: '/lab', color: '#00e5ff', desc: 'Extrair EXIF, GPS e metadados' },
    { name: 'Steganography Lab', icon: '🧪', href: '/lab', color: '#a855f7', desc: 'Ocultar/extrair mensagens' },
    { name: 'Error Level Analysis', icon: '🔬', href: '/lab', color: '#ff00aa', desc: 'Detectar manipulação' },
    { name: 'Inconsistency Scanner', icon: '📡', href: '/lab', color: '#3b82f6', desc: 'Scanner de anomalias' },
  ];

  const challenges = [
    { id: 'metadata-01', title: 'Encontre a Localização', diff: 'Easy', pts: 100, color: '#00e5ff', desc: 'Extraia coordenadas GPS de uma imagem.' },
    { id: 'steganography-01', title: 'Mensagem Oculta', diff: 'Medium', pts: 200, color: '#a855f7', desc: 'Decodifique mensagem secreta numa PNG.' },
    { id: 'forensics-01', title: 'Foto Editada?', diff: 'Hard', pts: 300, color: '#ff00aa', desc: 'Use ELA para detectar manipulação.' },
  ];

  return (
    <div className="min-h-screen grid-background" style={{ background: 'var(--bg-primary)' }}>
      <header className="glass" style={{ borderBottom: '1px solid var(--border-primary)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(0.75rem, 2vw, 1rem) 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 2vw, 0.75rem)' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <Image src="/logo_atual.png" alt="TraceLab OSINT" width={80} height={80} className="brand-logo" />
            </Link>
            <div>
              <span className="mono header-title-mobile" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontWeight: 700, color: 'var(--accent-primary)', lineHeight: 1.2 }}>Dashboard</span>
              <span className="header-hide-mobile" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>/ Painel</span>
            </div>
          </div>
          <nav className="mobile-nav">
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              {periodGreeting}, <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{userName}</span>
            </span>
            <Link href="/lab" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}>Lab</Link>
            <Link href="/challenges" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}>Desafios</Link>
            <Link href="/api/auth/logout" style={{ color: '#ff5dc3', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}>Sair</Link>
          </nav>
        </div>
      </header>

      <main className="container" style={{ padding: 'clamp(1.25rem, 3vw, 2rem) 1rem', paddingBottom: 'calc(64px + 1.5rem + env(safe-area-inset-bottom, 0))' }}>
        <div style={{ marginBottom: 'clamp(1.25rem, 3vw, 2rem)' }}>
          <h1 style={{ fontSize: 'clamp(1.35rem, 4vw, 1.75rem)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.2 }}>Bem-vindo ao TraceLab 👋</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: 1.5 }}>Explore ferramentas de análise forense digital e aprenda OSINT na prática.</p>
        </div>

        <div className="stats-grid" style={{ marginBottom: 'clamp(1.5rem, 3vw, 2rem)' }}>
          {[
            { icon: '📊', label: 'Total Análises', val: stats.totalAnalyses, c: '#00e5ff' },
            { icon: '🔍', label: 'Metadata', val: stats.metadataScans, c: '#3b82f6' },
            { icon: '🧪', label: 'Stego', val: stats.stegoTests, c: '#a855f7' },
            { icon: '🔬', label: 'ELA', val: stats.elaAnalyses, c: '#ff00aa' },
            { icon: '📡', label: 'Scanner', val: stats.scannerRuns, c: '#60a5fa' },
            { icon: '🏆', label: 'Desafios', val: `${stats.challengesCompleted}/120`, c: '#22d3ee' },
          ].map((s, i) => (
            <div key={i} className="glass" style={{ padding: 'clamp(0.875rem, 2.5vw, 1.25rem)', borderRadius: '0.75rem', borderTop: `3px solid ${s.c}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.75rem)', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{s.label}</div>
                  <div className="mono" style={{ fontSize: 'clamp(1.35rem, 4vw, 1.75rem)', fontWeight: 700, color: s.c, lineHeight: 1.1 }}>{s.val}</div>
                </div>
                <span style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="glass" style={{ borderRadius: '0.75rem', padding: 'clamp(1.1rem, 3vw, 1.5rem)', marginBottom: 'clamp(1.5rem, 3vw, 2rem)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.1rem)', fontWeight: 700, color: 'var(--text-primary)' }}>📈 Progresso de Aprendizado</h2>
            <span className="mono" style={{ fontSize: 'clamp(1.1rem, 3vw, 1.25rem)', fontWeight: 700, color: '#00e5ff' }}>{stats.learningScore}/100</span>
          </div>
          <div style={{ height: 'clamp(6px, 1.5vw, 8px)', borderRadius: '4px', background: 'var(--border-primary)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${stats.learningScore}%`, background: 'linear-gradient(to right, #00e5ff, #a855f7)', borderRadius: '4px', transition: 'width 1s ease', boxShadow: '0 0 8px rgba(0, 229, 255, 0.4)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.75rem)', color: 'var(--text-muted)' }}>Iniciante</span>
            <span style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.75rem)', color: 'var(--text-muted)' }}>Especialista</span>
          </div>
        </div>

        <div className="responsive-grid-2">
          <div>
            <h2 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.1rem)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>🛠️ Ferramentas Rápidas</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tools.map((t) => (
                <Link key={t.name} href={t.href} className="glass" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.75rem, 2vw, 1rem)', padding: 'clamp(0.875rem, 2.5vw, 1rem)', borderRadius: '0.75rem', textDecoration: 'none', borderLeft: `3px solid ${t.color}`, transition: 'all 0.2s' }}>
                  <span style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }}>{t.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'clamp(0.875rem, 2vw, 0.95rem)', lineHeight: 1.3 }}>{t.name}</div>
                    <div style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.75rem)', color: 'var(--text-muted)', lineHeight: 1.4, marginTop: '0.15rem' }}>{t.desc}</div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 'clamp(1.1rem, 2.5vw, 1.25rem)' }}>→</span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.1rem)', fontWeight: 700, color: 'var(--text-primary)' }}>🎯 Desafios CTF</h2>
              <Link href="/challenges" style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.8rem)', color: '#00e5ff', textDecoration: 'none', transition: 'color 0.2s' }}>Ver todos →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {challenges.map((ch) => (
                <div key={ch.id} className="glass" style={{ padding: 'clamp(0.875rem, 2.5vw, 1rem)', borderRadius: '0.75rem', borderLeft: `3px solid ${ch.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'clamp(0.875rem, 2vw, 0.95rem)', lineHeight: 1.3 }}>{ch.title}</span>
                    <span style={{ fontSize: 'clamp(0.625rem, 1.6vw, 0.65rem)', padding: '0.2rem 0.5rem', borderRadius: '999px', background: `${ch.color}20`, color: ch.color, fontWeight: 700, whiteSpace: 'nowrap' }}>{ch.diff}</span>
                  </div>
                  <p style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.75rem)', color: 'var(--text-muted)', marginBottom: '0.6rem', lineHeight: 1.4 }}>{ch.desc}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span className="mono" style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.75rem)', color: ch.color }}>🏆 {ch.pts} pts</span>
                    <span style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.75rem)', color: completedChallengeIds.includes(ch.id) ? '#22d3ee' : 'var(--text-muted)' }}>
                      {completedChallengeIds.includes(ch.id) ? '✅ Concluído' : '⏳ Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="py-12" style={{ borderTop: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', display: 'none' }}>
        <div className="container">
          <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
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

function readCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookie = parts.pop()?.split(';').shift();
    return cookie ? decodeURIComponent(cookie) : null;
  }
  return null;
}

