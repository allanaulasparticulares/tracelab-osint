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
    { name: 'Metadata Intelligence', icon: '🔍', href: '/lab?tool=metadata', color: '#00e5ff', desc: 'Extrair EXIF, GPS e metadados' },
    { name: 'Integrity Check', icon: '🧬', href: '/lab?tool=integrity', color: '#10b981', desc: 'Validação de hash e estrutura' },
    { name: 'Inconsistency Scanner', icon: '📡', href: '/lab?tool=inconsistency', color: '#3b82f6', desc: 'Sinais de manipulação temporal' },
    { name: 'Steganography PNG', icon: '🧪', href: '/lab?tool=stego-encode', color: '#a855f7', desc: 'Ocultar/extrair em imagens' },
    { name: 'Audio Steganography', icon: '🎙️', href: '/lab?tool=stego-audio-encode', color: '#f59e0b', desc: 'Ocultar mensagens em áudio WAV' },
    { name: 'Stego Analyzer', icon: '🛰️', href: '/lab?tool=stego-scan', color: '#60a5fa', desc: 'Detecção estatística LSB' },
    { name: 'Error Level Analysis', icon: '🔬', href: '/lab?tool=ela', color: '#ff00aa', desc: 'Análise de compressão/edição' },
    { name: 'Audio Spectrogram', icon: '🎼', href: '/lab?tool=spectrogram', color: '#22d3ee', desc: 'Análise de frequências sonoras' },
    { name: 'Bit Plane Slicer', icon: '🍰', href: '/lab?tool=bitplane', color: '#ec4899', desc: 'Decomposição de bits de imagem' },
    { name: 'Deep Hex Inspector', icon: '💾', href: '/lab?tool=hex', color: '#ec4899', desc: 'Análise binária e ASCII' },
    { name: 'Strings Extractor', icon: '📝', href: '/lab?tool=strings', color: '#10b981', desc: 'Busca de padrões de texto' },
    { name: 'Social Sherlock', icon: '🕵️', href: '/lab?tool=osint-user', color: '#f59e0b', desc: 'Rastreio de username OSINT' },
  ];

  const challenges = [
    { id: 'metadata-01', title: 'Encontre a Localização', diff: 'Easy', pts: 100, color: '#00e5ff', desc: 'Extraia coordenadas GPS de uma imagem.' },
    { id: 'steganography-01', title: 'Mensagem Oculta', diff: 'Medium', pts: 200, color: '#a855f7', desc: 'Decodifique mensagem secreta numa PNG.' },
    { id: 'forensics-01', title: 'Foto Editada?', diff: 'Hard', pts: 300, color: '#ff00aa', desc: 'Use ELA para detectar manipulação.' },
  ];

  return (
    <div className="min-h-screen grid-background" style={{ background: 'var(--bg-primary)' }}>
      <header className="glass header-hide-mobile" style={{ borderBottom: '1px solid var(--border-primary)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(0.75rem, 2vw, 1rem) 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 2vw, 0.75rem)' }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <Image src="/logo_atual.png" alt="TraceLab OSINT" width={64} height={64} className="brand-logo" />
            </Link>
            <div>
              <span className="mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)', lineHeight: 1.2 }}>Dashboard</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>/ Operativo</span>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {periodGreeting}, <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{userName}</span>
            </span>
            <Link
              href="/api/auth/logout"
              onClick={() => {
                window.localStorage.removeItem('tracelab_user_name');
                window.localStorage.removeItem('tracelab_user_email');
              }}
              style={{ color: '#ff5dc3', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}
            >
              Sair
            </Link>
          </nav>
        </div>
      </header>

      <main className="container" style={{ padding: 'clamp(1rem, 4vw, 1.5rem)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <span style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {periodGreeting}, Agente
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', marginTop: '0.25rem' }}>
              {userName}
            </h1>
          </div>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #00e5ff, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            border: '2px solid rgba(255,255,255,0.1)'
          }}>
            <span style={{ fontSize: '1.5rem' }}>👤</span>
          </div>
        </div>

        <div className="glass" style={{
          borderRadius: '1.5rem',
          padding: '2rem 1.5rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(11, 15, 26, 0.9), rgba(0, 229, 255, 0.15))',
          border: '1px solid rgba(0, 229, 255, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1.5rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'rgba(0, 229, 255, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
            <span style={{ fontSize: '2.5rem' }}>🎖️</span>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' }}>Status do Operativo</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
              {stats.learningScore > 80 ? 'Agente Veterano' : stats.learningScore > 40 ? 'Operativo de Campo' : 'Recruta em Treinamento'}
            </div>
          </div>

          <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />

          <div style={{ display: 'flex', gap: '2rem', width: '100%', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>Pontuação XP</div>
              <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
                {stats.challengesCompleted * 100 + stats.totalAnalyses * 10}
              </div>
            </div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>Missões</div>
              <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent-secondary)' }}>
                {stats.challengesCompleted}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem' }}>
          <Link href="/lab" className="glass" style={{
            padding: '1.25rem',
            borderRadius: '1.25rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(0,0,0,0.3))',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            transition: 'transform 0.2s'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.75rem' }}>🧪</span>
              <div>
                <span style={{ fontWeight: 800, color: '#fff', display: 'block', fontSize: '1rem' }}>Laboratório Forense</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}> workbench v1.0</span>
              </div>
            </div>
            <span style={{ fontSize: '1.25rem', opacity: 0.5 }}>→</span>
          </Link>

          <Link href="/challenges" className="glass" style={{
            padding: '1.25rem',
            borderRadius: '1.25rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(0,0,0,0.3))',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            transition: 'transform 0.2s'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.75rem' }}>🎯</span>
              <div>
                <span style={{ fontWeight: 800, color: '#fff', display: 'block', fontSize: '1.1rem' }}>Desafios CTF</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)' }}>academia de treinamento</span>
              </div>
            </div>
            <span style={{ fontSize: '1.25rem', opacity: 0.5 }}>→</span>
          </Link>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 className="text-sm font-bold text-accent uppercase tracking-widest mb-4">Acesso Rápido</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem' }}>
            {tools.map(tool => (
              <Link key={tool.name} href={tool.href} className="glass" style={{
                padding: '1rem 0.5rem',
                borderRadius: '1rem',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.02)'
              }}>
                <span style={{ fontSize: '1.5rem' }}>{tool.icon}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', lineHeight: '1.1' }}>{tool.name.split(' ')[0]}</span>
              </Link>
            ))}
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

