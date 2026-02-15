'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { extractImageMetadata, type MetadataResult } from '@/lib/metadata/extractor';
import { analyzeIntegrity, type IntegrityResult } from '@/lib/forensics/integrity-check';
import { scanInconsistencies, type InconsistencyReport } from '@/lib/forensics/inconsistency-scanner';
import { performELA, type ELAResult } from '@/lib/forensics/ela-analysis';
import { analyzePNG, decodePNG, encodePNG } from '@/lib/steganography/png-stego';

type ToolId =
  | 'metadata'
  | 'integrity'
  | 'inconsistency'
  | 'ela'
  | 'stego-encode'
  | 'stego-decode'
  | 'stego-scan';

const tools: Array<{ id: ToolId; name: string; icon: string; desc: string; color: string }> = [
  { id: 'metadata', name: 'Metadata Intelligence', icon: '🔍', desc: 'EXIF, GPS e risco de privacidade', color: '#00e5ff' },
  { id: 'integrity', name: 'Integrity Check', icon: '🧬', desc: 'SHA-256, magic bytes e entropia', color: '#3b82f6' },
  { id: 'inconsistency', name: 'Inconsistency Scanner', icon: '📡', desc: 'Correlação temporal e lógica', color: '#22d3ee' },
  { id: 'ela', name: 'Error Level Analysis', icon: '🔬', desc: 'Detecção de manipulação por compressão', color: '#ff00aa' },
  { id: 'stego-encode', name: 'Stego Encode', icon: '🧪', desc: 'Ocultar mensagem em PNG', color: '#a855f7' },
  { id: 'stego-decode', name: 'Stego Decode', icon: '🗝️', desc: 'Extrair mensagem de PNG', color: '#8b5cf6' },
  { id: 'stego-scan', name: 'Stego Analyzer', icon: '🛰️', desc: 'Triagem de indícios LSB', color: '#f472b6' },
];

export default function LabPage() {
  const [activeTool, setActiveTool] = useState<ToolId>('metadata');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [quality, setQuality] = useState(90);
  const [secretText, setSecretText] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [metadataResult, setMetadataResult] = useState<MetadataResult | null>(null);
  const [integrityResult, setIntegrityResult] = useState<IntegrityResult | null>(null);
  const [inconsistencyResult, setInconsistencyResult] = useState<InconsistencyReport | null>(null);
  const [elaResult, setElaResult] = useState<ELAResult | null>(null);
  const [stegoEncodeResult, setStegoEncodeResult] = useState<{ image?: string; stats?: { capacity: number; used: number; efficiency: number } } | null>(null);
  const [stegoDecodeResult, setStegoDecodeResult] = useState<string>('');
  const [stegoScanResult, setStegoScanResult] = useState<{ suspicious: boolean; score: number; indicators: string[] } | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const selectedTool = useMemo(() => tools.find((tool) => tool.id === activeTool), [activeTool]);

  const clearToolResults = () => {
    setError('');
    setMetadataResult(null);
    setIntegrityResult(null);
    setInconsistencyResult(null);
    setElaResult(null);
    setStegoEncodeResult(null);
    setStegoDecodeResult('');
    setStegoScanResult(null);
  };

  const runTool = async () => {
    setError('');

    if (!file) {
      setError('Selecione uma imagem para continuar.');
      return;
    }

    setBusy(true);
    try {
      if (activeTool === 'metadata') {
        const result = await extractImageMetadata(file);
        setMetadataResult(result);
      }

      if (activeTool === 'integrity') {
        const result = await analyzeIntegrity(file);
        setIntegrityResult(result);
      }

      if (activeTool === 'inconsistency') {
        const extracted = await extractImageMetadata(file);
        if (!extracted.success || !extracted.metadata) {
          throw new Error(extracted.error || 'Falha ao extrair metadados para correlação.');
        }

        const report = scanInconsistencies(extracted.metadata, {
          created: new Date(file.lastModified),
          modified: new Date(file.lastModified),
        });
        setMetadataResult(extracted);
        setInconsistencyResult(report);
      }

      if (activeTool === 'ela') {
        const result = await performELA(file, quality);
        setElaResult(result);
      }

      if (activeTool === 'stego-encode') {
        if (!secretText.trim()) {
          throw new Error('Digite uma mensagem para ocultar.');
        }
        const result = await encodePNG(file, secretText.trim(), password.trim() || undefined);
        if (!result.success) {
          throw new Error(result.error || 'Falha ao codificar esteganografia.');
        }
        setStegoEncodeResult({ image: result.image, stats: result.stats });
      }

      if (activeTool === 'stego-decode') {
        const result = await decodePNG(file, password.trim() || undefined);
        if (!result.success) {
          throw new Error(result.error || 'Nenhuma mensagem encontrada.');
        }
        setStegoDecodeResult(result.data || '');
      }

      if (activeTool === 'stego-scan') {
        const result = await analyzePNG(file);
        setStegoScanResult(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado no laboratório.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid-background" style={{ background: 'var(--bg-primary)' }}>
      <header className="glass" style={{ borderBottom: '1px solid var(--border-primary)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <Image src="/logo_atual.png" alt="TraceLab OSINT" width={80} height={80} className="brand-logo" />
            <div>
              <span className="mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-primary)' }}>TraceLab Lab</span>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>OSINT Forensics Workbench</p>
            </div>
          </Link>

          <nav className="mobile-nav">
            <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>Dashboard</Link>
            <Link href="/challenges" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>Desafios</Link>
            <Link href="/api/auth/logout" style={{ color: '#ff5dc3', textDecoration: 'none', fontSize: '0.875rem' }}>Sair</Link>
          </nav>

        </div>
      </header>

      <main className="container" style={{ padding: '1.6rem 1.5rem 3rem', position: 'relative', zIndex: 2 }}>
        <section className="glass" style={{ borderRadius: '0.9rem', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setActiveTool(tool.id);
                  clearToolResults();
                }}
                className={activeTool === tool.id ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem', borderColor: activeTool === tool.id ? tool.color : undefined }}
              >
                {tool.icon} {tool.name}
              </button>
            ))}
          </div>
        </section>

        <section className="responsive-grid-2" style={{ alignItems: 'start' }}>
          <div className="glass" style={{ borderRadius: '0.9rem', padding: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.7rem' }}>{selectedTool?.icon} {selectedTool?.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.9rem' }}>{selectedTool?.desc}</p>

            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Imagem</label>
            <input
              type="file"
              accept="image/*"
              className="input"
              onChange={(event) => {
                const selected = event.target.files?.[0] || null;
                setFile(selected);
                clearToolResults();
              }}
              disabled={busy}
            />

            {(activeTool === 'ela') && (
              <div style={{ marginTop: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Qualidade ELA: {quality}
                </label>
                <input
                  type="range"
                  min={65}
                  max={98}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  style={{ width: '100%' }}
                  disabled={busy}
                />
              </div>
            )}

            {(activeTool === 'stego-encode') && (
              <div style={{ marginTop: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Mensagem secreta</label>
                <textarea
                  value={secretText}
                  onChange={(e) => setSecretText(e.target.value)}
                  className="input"
                  rows={5}
                  placeholder="Digite a mensagem para ocultar"
                  disabled={busy}
                />
              </div>
            )}

            {(activeTool === 'stego-encode' || activeTool === 'stego-decode') && (
              <div style={{ marginTop: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Senha opcional</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  type="text"
                  placeholder="Senha para proteger a mensagem"
                  disabled={busy}
                />
              </div>
            )}

            {error && (
              <div style={{ marginTop: '0.9rem', padding: '0.75rem', borderRadius: '0.6rem', border: '1px solid rgba(255,0,170,0.35)', background: 'rgba(255,0,170,0.12)', color: '#ff8ccd', fontSize: '0.82rem' }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.6rem' }}>
              <button type="button" className="btn btn-primary" onClick={runTool} disabled={busy || !file}>
                {busy ? 'Processando...' : 'Executar Ferramenta'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setFile(null);
                  setSecretText('');
                  setPassword('');
                  clearToolResults();
                }}
                disabled={busy}
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="glass" style={{ borderRadius: '0.9rem', padding: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.7rem' }}>Resultado</h3>

            {previewUrl && (
              <div style={{ marginBottom: '0.8rem' }}>
                <Image
                  src={previewUrl}
                  alt="Prévia"
                  width={1200}
                  height={800}
                  unoptimized
                  style={{ width: '100%', height: '240px', borderRadius: '0.7rem', border: '1px solid var(--border-primary)', objectFit: 'contain', background: '#020617' }}
                />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                  {file?.name} • {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}
                </p>
              </div>
            )}

            {activeTool === 'metadata' && metadataResult && (
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                <div style={{ fontSize: '0.82rem', color: metadataResult.success ? '#67e8f9' : '#ff8ccd' }}>
                  {metadataResult.success ? 'Análise concluída' : metadataResult.error}
                </div>
                {metadataResult.success && (
                  <pre className="card" style={{ margin: 0, padding: '0.9rem', fontSize: '0.75rem' }}>
                    {JSON.stringify(metadataResult.metadata, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {activeTool === 'integrity' && integrityResult && (
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                <div style={{ fontSize: '0.82rem', color: integrityResult.success ? '#67e8f9' : '#ff8ccd' }}>
                  {integrityResult.success ? 'Integridade calculada' : integrityResult.error}
                </div>
                {integrityResult.summary && (
                  <pre className="card" style={{ margin: 0, padding: '0.9rem', fontSize: '0.75rem' }}>
                    {JSON.stringify(integrityResult.summary, null, 2)}
                  </pre>
                )}
                {!!integrityResult.warnings?.length && (
                  <ul style={{ listStyle: 'none', display: 'grid', gap: '0.35rem' }}>
                    {integrityResult.warnings.map((warning, index) => (
                      <li key={index} style={{ fontSize: '0.78rem', color: '#fda4af' }}>• {warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTool === 'inconsistency' && inconsistencyResult && (
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                <div className="card" style={{ padding: '0.9rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Risco geral</div>
                  <div className="mono" style={{ fontSize: '1.15rem', color: '#00e5ff', fontWeight: 700 }}>
                    {inconsistencyResult.overallRisk.toUpperCase()} ({inconsistencyResult.score}/100)
                  </div>
                </div>
                <pre className="card" style={{ margin: 0, padding: '0.9rem', fontSize: '0.75rem' }}>
                  {JSON.stringify(inconsistencyResult.inconsistencies.slice(0, 8), null, 2)}
                </pre>
              </div>
            )}

            {activeTool === 'ela' && elaResult && (
              <div style={{ display: 'grid', gap: '0.8rem' }}>
                <div className="card" style={{ padding: '0.9rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score de manipulação</div>
                  <div className="mono" style={{ fontSize: '1.25rem', color: '#ff78d5', fontWeight: 700 }}>{elaResult.overallScore}/100</div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>{elaResult.explanation}</p>
                </div>
                {elaResult.elaImage && (
                  <Image
                    src={elaResult.elaImage}
                    alt="ELA"
                    width={1200}
                    height={800}
                    unoptimized
                    style={{ width: '100%', height: 'auto', borderRadius: '0.7rem', border: '1px solid var(--border-primary)' }}
                  />
                )}
                {elaResult.heatmap && (
                  <Image
                    src={elaResult.heatmap}
                    alt="Heatmap"
                    width={1200}
                    height={800}
                    unoptimized
                    style={{ width: '100%', height: 'auto', borderRadius: '0.7rem', border: '1px solid var(--border-primary)' }}
                  />
                )}
              </div>
            )}

            {activeTool === 'stego-encode' && stegoEncodeResult && (
              <div style={{ display: 'grid', gap: '0.8rem' }}>
                <div style={{ fontSize: '0.82rem', color: '#67e8f9' }}>Mensagem ocultada com sucesso.</div>
                {stegoEncodeResult.image && (
                  <>
                    <Image
                      src={stegoEncodeResult.image}
                      alt="Imagem com esteganografia"
                      width={1200}
                      height={800}
                      unoptimized
                      style={{ width: '100%', height: 'auto', borderRadius: '0.7rem', border: '1px solid var(--border-primary)' }}
                    />
                    <a href={stegoEncodeResult.image} download="stego-image.png" className="btn btn-secondary" style={{ width: 'fit-content' }}>
                      Baixar imagem codificada
                    </a>
                  </>
                )}
                {stegoEncodeResult.stats && (
                  <pre className="card" style={{ margin: 0, padding: '0.9rem', fontSize: '0.75rem' }}>
                    {JSON.stringify(stegoEncodeResult.stats, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {activeTool === 'stego-decode' && stegoDecodeResult && (
              <div className="card" style={{ padding: '0.9rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>Mensagem extraída</div>
                <pre style={{ margin: 0, fontSize: '0.82rem' }}>{stegoDecodeResult}</pre>
              </div>
            )}

            {activeTool === 'stego-scan' && stegoScanResult && (
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                <div className="card" style={{ padding: '0.9rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Probabilidade de esteganografia</div>
                  <div className="mono" style={{ fontSize: '1.2rem', color: stegoScanResult.suspicious ? '#ff8ccd' : '#67e8f9', fontWeight: 700 }}>
                    {stegoScanResult.suspicious ? 'SUSPEITO' : 'BAIXO RISCO'} ({stegoScanResult.score}%)
                  </div>
                </div>
                <ul style={{ listStyle: 'none', display: 'grid', gap: '0.35rem' }}>
                  {stegoScanResult.indicators.map((indicator, index) => (
                    <li key={index} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>• {indicator}</li>
                  ))}
                </ul>
              </div>
            )}

            {!file && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Selecione uma imagem e execute uma ferramenta para ver o resultado.
              </p>
            )}
          </div>
        </section>
      </main>

      <footer className="py-12" style={{ borderTop: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
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
