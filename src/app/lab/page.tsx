'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { extractImageMetadata, type MetadataResult } from '@/lib/metadata/extractor';
import { analyzeIntegrity, type IntegrityResult } from '@/lib/forensics/integrity-check';
import { scanInconsistencies, type InconsistencyReport } from '@/lib/forensics/inconsistency-scanner';
import { performELA, type ELAResult } from '@/lib/forensics/ela-analysis';
import { analyzePNG, decodePNG, encodePNG } from '@/lib/steganography/png-stego';
import { decodeAudio, encodeAudio, type AudioStegoResult } from '@/lib/steganography/audio-stego';
import { extractStrings, type StringsResult } from '@/lib/forensics/strings-extractor';
import { sliceBitPlanes, type BitPlaneResult } from '@/lib/forensics/bit-plane-slicer';
import { readHexChunk, type HexChunk } from '@/lib/forensics/hex-viewer';
import { generateProfileLinks, type SocialPlatform, type PlatformCategory } from '@/lib/osint/social-platforms';
import { generateSpectrogram, type SpectrogramResult } from '@/lib/forensics/spectrogram';

type ToolId =
  | 'metadata'
  | 'integrity'
  | 'inconsistency'
  | 'ela'
  | 'stego-encode'
  | 'stego-decode'
  | 'stego-scan'
  | 'strings'
  | 'bitplane'
  | 'hex'
  | 'spectrogram'
  | 'stego-audio-encode'
  | 'stego-audio-decode'
  | 'osint-user';

type ToolCategory = 'Forensics' | 'Steganography' | 'OSINT' | 'Analysis';

interface ToolDef {
  id: ToolId;
  name: string;
  icon: string;
  desc: string;
  category: ToolCategory;
}

const tools: ToolDef[] = [
  // Analysis
  { id: 'metadata', name: 'Metadata Intelligence', icon: '🔍', desc: 'Extração profunda de EXIF/GPS', category: 'Analysis' },
  { id: 'integrity', name: 'Integrity Check', icon: '🧬', desc: 'Validação de hash e estrutura', category: 'Analysis' },
  { id: 'inconsistency', name: 'Inconsistency Scanner', icon: '📡', desc: 'Correlação de dados temporais', category: 'Analysis' },
  { id: 'ela', name: 'Error Level Analysis', icon: '🔬', desc: 'Detecção de manipulação visual', category: 'Analysis' },

  // Forensic tools
  { id: 'hex', name: 'Deep Hex Inspector', icon: '💾', desc: 'Análise binária (Hex/ASCII)', category: 'Forensics' },
  { id: 'strings', name: 'Strings Extractor', icon: '📝', desc: 'Busca de padrões de texto', category: 'Forensics' },
  { id: 'bitplane', name: 'Bit Plane Slicer', icon: '🍰', desc: 'Decomposição de camadas de bits', category: 'Forensics' },
  { id: 'spectrogram', name: 'Audio Spectrogram', icon: '🎼', desc: 'Análise de espectro de áudio', category: 'Forensics' },

  // Steganography tools
  { id: 'stego-scan', name: 'Stego Analyzer', icon: '🛰️', desc: 'Detecção estatística LSB', category: 'Steganography' },
  { id: 'stego-encode', name: 'Stego PNG Encode', icon: '🧪', desc: 'Ocultar mensagem em imagem', category: 'Steganography' },
  { id: 'stego-decode', name: 'Stego PNG Decode', icon: '🔓', desc: 'Extrair mensagem de imagem', category: 'Steganography' },
  { id: 'stego-audio-encode', name: 'Audio Stego Encode', icon: '🎙️', desc: 'Ocultar mensagem em áudio', category: 'Steganography' },
  { id: 'stego-audio-decode', name: 'Audio Stego Decode', icon: '🎧', desc: 'Extrair mensagem de áudio', category: 'Steganography' },

  // OSINT tools
  { id: 'osint-user', name: 'Social Sherlock', icon: '🕵️', desc: 'Rastreio de username OSINT', category: 'OSINT' },
];

export default function LabPage() {
  const router = useRouter();
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Tool States
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [quality, setQuality] = useState(90); // ELA quality
  const [secretText, setSecretText] = useState(''); // Stego
  const [password, setPassword] = useState(''); // Stego
  const [minLength, setMinLength] = useState(4); // Strings
  const [targetUsername, setTargetUsername] = useState(''); // OSINT

  // Hex Viewer State
  const [hexOffset, setHexOffset] = useState(0);
  const [hexResult, setHexResult] = useState<HexChunk | null>(null);
  const HEX_PAGE_SIZE = 512; // bytes per view

  // Status & Results
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0); // Progress para operações longas

  const [metadataResult, setMetadataResult] = useState<MetadataResult | null>(null);
  const [integrityResult, setIntegrityResult] = useState<IntegrityResult | null>(null);
  const [inconsistencyReport, setInconsistencyReport] = useState<InconsistencyReport | null>(null);
  const [elaResult, setElaResult] = useState<ELAResult | null>(null);
  const [stegoEncodeResult, setStegoEncodeResult] = useState<{ image?: string; stats?: { capacity: number; used: number; efficiency: number } } | null>(null);
  const [stegoDecodeResult, setStegoDecodeResult] = useState<string>('');
  const [stegoAudioResult, setStegoAudioResult] = useState<AudioStegoResult | null>(null);
  const [stegoAudioDecodeResult, setStegoAudioDecodeResult] = useState<string>('');
  const [stegoScanResult, setStegoScanResult] = useState<{ suspicious: boolean; score: number; indicators: string[] } | null>(null);
  const [stringsResult, setStringsResult] = useState<StringsResult | null>(null);
  const [bitPlaneResult, setBitPlaneResult] = useState<BitPlaneResult | null>(null);
  const [spectrogramResult, setSpectrogramResult] = useState<SpectrogramResult | null>(null);
  const [osintResult, setOsintResult] = useState<Array<SocialPlatform & { link: string }> | null>(null);
  const [osintFilter, setOsintFilter] = useState<PlatformCategory | 'All'>('All');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    // Only set preview for images
    if (file.type.startsWith('image/')) {
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl('');
    }
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const selectedTool = useMemo(() => tools.find((tool) => tool.id === activeTool), [activeTool]);

  const clearToolResults = () => {
    setError('');
    setMetadataResult(null);
    setIntegrityResult(null);
    setInconsistencyReport(null);
    setElaResult(null);
    setStegoEncodeResult(null);
    setStegoDecodeResult('');
    setStegoAudioResult(null);
    setStegoAudioDecodeResult('');
    setStegoScanResult(null);
    setStringsResult(null);
    setBitPlaneResult(null);
    setSpectrogramResult(null);
    setHexResult(null);
    setHexOffset(0);
    setOsintResult(null);
  };

  const runTool = async () => {
    setError('');

    if (activeTool === 'osint-user') {
      if (!targetUsername.trim()) {
        setError('Digite um nome de usuário para pesquisar.');
        return;
      }
      setBusy(true);
      // Simulating "search" generation
      const links = generateProfileLinks(targetUsername);
      setOsintResult(links);
      setBusy(false);
      return;
    }

    if (!file) {
      setError('Selecione um arquivo para continuar.');
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
        setInconsistencyReport(report);
      }

      if (activeTool === 'ela') {
        setProgress(0);
        const result = await performELA(file, quality, (p) => setProgress(p));
        setElaResult(result);
        setProgress(100);
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

      if (activeTool === 'strings') {
        setProgress(0);
        const result = await extractStrings(file, minLength, {
          onProgress: (percent: number) => setProgress(percent)
        });
        setStringsResult(result);
        setProgress(100);
        if (!result.success) throw new Error(result.error);
      }

      if (activeTool === 'bitplane') {
        setProgress(0);
        const result = await sliceBitPlanes(file, (p) => setProgress(p));
        setBitPlaneResult(result);
        setProgress(100);
        if (!result.success) throw new Error(result.error);
      }

      if (activeTool === 'spectrogram') {
        const result = await generateSpectrogram(file);
        setSpectrogramResult(result);
        if (!result.success) throw new Error(result.error);
      }

      if (activeTool === 'stego-audio-encode') {
        if (!secretText.trim()) throw new Error('Digite uma mensagem para ocultar.');
        const result = await encodeAudio(file, secretText.trim(), password.trim() || undefined);
        if (!result.success) throw new Error(result.error);
        setStegoAudioResult(result);
      }

      if (activeTool === 'stego-audio-decode') {
        const result = await decodeAudio(file, password.trim() || undefined);
        if (!result.success) throw new Error(result.error || 'Nenhuma mensagem encontrada no áudio.');
        setStegoAudioDecodeResult(result.data || '');
      }

      if (activeTool === 'hex') {
        const result = await readHexChunk(file, hexOffset, HEX_PAGE_SIZE);
        setHexResult(result);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado no laboratório.');
    } finally {
      setBusy(false);
    }
  };

  const handleHexPage = async (direction: 'next' | 'prev') => {
    if (!file) return;
    let newOffset = hexOffset;
    if (direction === 'next') newOffset += HEX_PAGE_SIZE;
    else newOffset -= HEX_PAGE_SIZE;

    if (newOffset < 0) newOffset = 0;
    if (newOffset >= file.size) return; // End

    setHexOffset(newOffset);
    setBusy(true);
    try {
      const result = await readHexChunk(file, newOffset, HEX_PAGE_SIZE);
      setHexResult(result);
    } catch {
      setError('Erro ao ler página hex.');
    } finally {
      setBusy(false);
    }
  };

  const categories: ToolCategory[] = ['Analysis', 'Forensics', 'Steganography', 'OSINT'];

  return (
    <div className="lab-layout">
      {/* Mobile Overlay */}
      <div
        className={`mobile-overlay md:hidden ${isSidebarOpen ? 'visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Mobile Header */}
      <header className="lab-header-mobile" style={{ height: '56px', padding: '0 0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="menu-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}
          >
            ☰
          </button>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Image src="/logo_atual.png" alt="Logo" width={32} height={32} />
            <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>TraceLab</span>
          </Link>
        </div>
        <button
          onClick={() => {
            if (activeTool) setActiveTool(null);
            else router.back();
          }}
          className="text-sm text-muted"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
        >
          {activeTool ? 'Menu' : 'Voltar'}
        </button>
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, backdropFilter: 'blur(4px)' }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`lab-sidebar ${isSidebarOpen ? 'open' : ''}`} style={{
        zIndex: 101,
        boxShadow: isSidebarOpen ? '20px 0 50px rgba(0,0,0,0.5)' : 'none'
      }}>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-primary)' }}>
          <div style={{ background: 'var(--accent-primary)', padding: '6px', borderRadius: '10px' }}>
            <Image src="/logo_atual.png" alt="TraceLab" width={32} height={32} />
          </div>
          <div>
            <h1 className="mono" style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', letterSpacing: '1px' }}>TRACELAB</h1>
            <p className="text-xs" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>WORKBENCH V1.0</p>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '1rem 0', scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <div key={cat} style={{ marginBottom: '1.5rem' }}>
              <div className="tool-category" style={{
                padding: '0 1.5rem 0.5rem',
                fontSize: '0.7rem',
                fontWeight: 800,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '2px'
              }}>{cat}</div>
              <div style={{ display: 'grid', gap: '4px', padding: '0 0.75rem' }}>
                {tools.filter(t => t.category === cat).map(tool => (
                  <button
                    key={tool.id}
                    type="button"
                    className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
                    style={{
                      borderRadius: '12px',
                      padding: '0.75rem 0.75rem',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      justifyContent: 'flex-start',
                      border: 'none',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTool(tool.id);
                      setIsSidebarOpen(false);
                      clearToolResults();
                    }}
                  >
                    <span className="tool-icon" style={{ fontSize: '1.25rem', width: '32px' }}>{tool.icon}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{tool.name}</span>
                    {activeTool === tool.id && (
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary)' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-primary)' }}>
          <Link href="/dashboard" className="tool-btn" style={{
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.1rem' }}>🏠</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>SAIR DO WORKBENCH</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lab-main">
        <div className="container animate-in">
          <header style={{ marginBottom: '2rem' }}>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span style={{ fontSize: '2rem' }}>{selectedTool?.icon || '🧪'}</span>
              {selectedTool?.name || 'Workbench'}
            </h2>
            <p className="text-muted" style={{ marginTop: '0.5rem' }}>{selectedTool?.desc || 'Selecione uma ferramenta no menu para iniciar a análise forense.'}</p>
          </header>

          {!activeTool ? (
            <div className="stats-grid" style={{ marginTop: '1rem' }}>
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className="glass"
                  style={{
                    padding: '1.5rem',
                    borderRadius: '1rem',
                    textAlign: 'center',
                    border: '1px solid var(--border-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{tool.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{tool.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{tool.category}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="workspace-grid">
              {/* INPUT PANEL */}
              <div className="workspace-panel">
                <h3 className="text-sm font-bold text-accent" style={{ marginBottom: '1rem', textTransform: 'uppercase' }}>Entrada de Dados</h3>

                {activeTool === 'osint-user' ? (
                  <div>
                    <label className="text-sm text-muted mb-2" style={{ display: 'block' }}>Username Alvo</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ex: allananjos"
                      value={targetUsername}
                      onChange={e => setTargetUsername(e.target.value)}
                      disabled={busy}
                    />
                    <p className="text-xs text-muted mt-2">Gera links de pesquisa direta em múltiplas plataformas.</p>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm text-muted mb-2" style={{ display: 'block' }}>Arquivo Alvo</label>
                    <div
                      className="input"
                      style={{
                        height: '120px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderStyle: 'dashed',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <input
                        type="file"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setFile(f);
                            clearToolResults();
                          }
                        }}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                        accept={activeTool.includes('audio') || activeTool === 'spectrogram' ? 'audio/*' : (activeTool === 'strings' || activeTool === 'hex' || activeTool === 'integrity') ? '*/*' : 'image/*'}
                        disabled={busy}
                      />
                      {file ? (
                        <>
                          <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</span>
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-muted">{(file.size / 1024).toFixed(2)} KB</span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📤</span>
                          <span className="text-sm text-muted">Clique ou arraste um arquivo</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
                  {activeTool === 'ela' && (
                    <div>
                      <label className="text-sm text-muted mb-2" style={{ display: 'block' }}>Qualidade ({quality}%)</label>
                      <input type="range" min="50" max="100" value={quality} onChange={e => setQuality(Number(e.target.value))} style={{ width: '100%' }} />
                    </div>
                  )}

                  {activeTool === 'strings' && (
                    <div>
                      <label className="text-sm text-muted mb-2" style={{ display: 'block' }}>Tamanho Mínimo ({minLength} chars)</label>
                      <input type="number" min="3" max="50" value={minLength} onChange={e => setMinLength(Number(e.target.value))} className="input" />
                    </div>
                  )}

                  {(activeTool === 'stego-encode' || activeTool === 'stego-audio-encode') && (
                    <>
                      <textarea
                        className="input"
                        rows={4}
                        placeholder="Mensagem secreta..."
                        value={secretText}
                        onChange={e => setSecretText(e.target.value)}
                      />
                      <input
                        type="password"
                        className="input"
                        placeholder="Senha (Opcional)"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                    </>
                  )}
                  {(activeTool === 'stego-decode' || activeTool === 'stego-audio-decode') && (
                    <input
                      type="password"
                      className="input"
                      placeholder="Senha (se houver)"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  )}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button className="btn btn-primary" onClick={runTool} disabled={busy} style={{ flex: 1 }}>
                      {busy ? 'Processando...' : 'Executar Análise'}
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setFile(null); clearToolResults(); setTargetUsername(''); }}>
                      Limpar
                    </button>
                  </div>

                  {busy && progress > 0 && progress < 100 && (
                    <div className="w-full bg-black/40 rounded-full h-1.5 mt-4 overflow-hidden border border-white/10">
                      <div
                        className="bg-accent h-full transition-all duration-300"
                        style={{ width: `${progress}%`, boxShadow: '0 0 10px var(--accent-primary)' }}
                      />
                    </div>
                  )}

                  {error && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                </div>
              </div>

              {/* RESULTS PANEL */}
              <div className="workspace-panel" style={{ minHeight: '400px' }}>
                <h3 className="text-sm font-bold text-accent" style={{ marginBottom: '1rem', textTransform: 'uppercase' }}>Resultados</h3>

                {previewUrl && !activeTool.match(/hex|strings|integrity|osint-user|spectrogram/) && (
                  <div style={{ marginBottom: '1.5rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-primary)', background: '#000' }}>
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      width={800}
                      height={400}
                      style={{ width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'contain', background: '#020617' }}
                      unoptimized
                    />
                  </div>
                )}

                <div className="result-content">
                  {activeTool === 'metadata' && metadataResult && (
                    <div className="space-y-4">
                      <div className={`p-4 rounded border ${metadataResult.riskLevel === 'high' ? 'border-red-500 bg-red-500/10' : 'border-green-500 bg-green-500/10'}`}>
                        <div className="font-bold mb-2">Análise de Risco: {metadataResult.riskLevel?.toUpperCase()}</div>
                        {metadataResult.warnings?.map((w, i) => <div key={i} className="text-xs opacity-80">• {w}</div>)}
                      </div>
                      <pre className="text-xs p-4 bg-black/30 rounded overflow-auto max-h-[400px]">
                        {JSON.stringify(metadataResult.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  {activeTool === 'osint-user' && osintResult && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2 mb-4 bg-black/20 p-2 rounded border border-border-primary">
                        {['All', 'Social', 'Dev', 'Msg', 'Video', 'Game', 'Music', 'Blog', 'Photo', 'Misc'].map(cat => (
                          <button
                            key={cat}
                            onClick={() => setOsintFilter(cat as PlatformCategory | 'All')}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${osintFilter === cat ? 'bg-accent text-black shadow-[0_0_10px_rgba(0,229,255,0.5)]' : 'bg-black/40 text-muted hover:text-white'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                        {osintResult
                          .filter(p => osintFilter === 'All' || p.category === osintFilter)
                          .map(p => (
                            <a
                              key={p.name}
                              href={p.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="card group"
                              style={{
                                padding: '0.75rem',
                                textDecoration: 'none',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem',
                                border: '1px solid var(--border-primary)',
                                background: 'rgba(30, 41, 59, 0.3)'
                              }}
                            >
                              <span className="font-bold text-sm text-white group-hover:text-accent transition-colors">{p.name}</span>
                              <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded" style={{ background: 'rgba(0, 229, 255, 0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(0, 229, 255, 0.2)' }}>{p.category}</span>
                            </a>
                          ))}
                      </div>
                    </div>
                  )}

                  {activeTool === 'hex' && hexResult && (
                    <div>
                      <div className="flex justify-between items-center mb-4 text-xs font-mono text-accent">
                        <span>OFFSET: {hexResult.offset.toString(16).toUpperCase().padStart(8, '0')}</span>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary py-1 px-3 text-xs" onClick={() => handleHexPage('prev')} disabled={hexOffset === 0}>ANTERIOR</button>
                          <button className="btn btn-secondary py-1 px-3 text-xs" onClick={() => handleHexPage('next')}>PRÓXIMO</button>
                        </div>
                      </div>
                      <div className="hex-container">
                        {hexResult.hex.map((line, i) => (
                          <div key={i} className="hex-row">
                            <span className="hex-offset-col">{(hexResult.offset + i * 16).toString(16).toUpperCase().padStart(8, '0')}</span>
                            <div className="hex-bytes-col">
                              {line.split(' ').map((byte, j) => byte.trim() && (
                                <span key={j} className={`hex-byte ${byte === '00' ? 'null' : (parseInt(byte, 16) >= 32 && parseInt(byte, 16) <= 126) ? 'printable' : ''}`} title={`Dec: ${parseInt(byte, 16)}`}>{byte}</span>
                              ))}
                            </div>
                            <span className="hex-ascii-col whitespace-pre">{hexResult.ascii[i]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTool === 'bitplane' && bitPlaneResult && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {bitPlaneResult.planes?.map((p) => (
                        <div key={p.bit} className="bg-black/40 p-2 rounded border border-border-primary text-center">
                          <div className="text-xs mb-1 text-muted">Bit {p.bit}</div>
                          <Image src={p.image} alt="Plane" width={150} height={150} className="w-full h-auto" unoptimized />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTool === 'strings' && stringsResult && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-accent">Encontradas: {stringsResult.totalFound}</div>
                      </div>
                      <div className="bg-black/30 rounded border border-border-primary overflow-hidden">
                        <div className="max-h-[500px] overflow-auto p-4 font-mono text-xs">
                          {stringsResult.matches?.map((match: { value: string; offset: number }, idx: number) => (
                            <div key={idx} className="flex gap-4 hover:bg-white/5 py-0.5 border-b border-white/5 last:border-0">
                              <span className="text-muted w-16 select-none">{match.offset.toString(16).toUpperCase().padStart(8, '0')}</span>
                              <span className="text-green-400 break-all">{match.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTool === 'integrity' && integrityResult && integrityResult.summary && (
                    <div className="space-y-4">
                      <div className="p-4 bg-black/30 rounded border border-border-primary">
                        <div className="text-xs text-muted">SHA-256 Hash</div>
                        <div className="text-xs font-mono text-accent break-all">{integrityResult.summary.sha256}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-black/30 rounded">
                          <div className="text-xs text-muted">Entropia</div>
                          <div className="text-sm font-bold">{integrityResult.summary.entropy?.toFixed(4)}</div>
                        </div>
                        <div className="p-3 bg-black/30 rounded">
                          <div className="text-xs text-muted">Magic Bytes</div>
                          <div className="text-sm font-mono text-green-400">{integrityResult.summary.magicBytes}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTool === 'inconsistency' && inconsistencyReport && (
                    <div className="space-y-4">
                      <div className={`p-4 rounded border ${inconsistencyReport.score > 50 ? 'border-red-500 bg-red-500/10' : 'border-green-500 bg-green-500/10'}`}>
                        <div className="text-xs text-muted">Risco Geral</div>
                        <div className="text-2xl font-bold">{inconsistencyReport.overallRisk.toUpperCase()} ({inconsistencyReport.score}/100)</div>
                      </div>
                      <pre className="text-xs p-4 bg-black/30 rounded overflow-auto max-h-[400px]">
                        {JSON.stringify(inconsistencyReport.inconsistencies.slice(0, 8), null, 2)}
                      </pre>
                    </div>
                  )}

                  {activeTool === 'ela' && elaResult && (
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-black/30 rounded">
                        <div className="text-xs text-muted">Pontuação ELA</div>
                        <div className="text-3xl font-bold text-accent">{elaResult.overallScore}/100</div>
                        <p className="text-xs text-muted mt-2">{elaResult.explanation}</p>
                      </div>
                      {elaResult.elaImage && <Image src={elaResult.elaImage} alt="ELA" width={600} height={400} className="w-full rounded border border-border-primary" unoptimized />}
                    </div>
                  )}

                  {activeTool === 'spectrogram' && spectrogramResult && (
                    <div className="space-y-4">
                      <div className="p-4 bg-black/30 rounded border border-border-primary">
                        <div className="text-xs text-muted">Duração do Áudio</div>
                        <div className="text-xl font-bold text-accent">{spectrogramResult.duration?.toFixed(2)}s</div>
                      </div>
                      {spectrogramResult.spectrogram && (
                        <div className="overflow-x-auto bg-black/40 p-2 rounded border border-border-primary">
                          <Image src={spectrogramResult.spectrogram} alt="Spectrogram" width={4096} height={512} className="h-[250px] w-auto max-w-none" unoptimized />
                        </div>
                      )}
                    </div>
                  )}

                  {activeTool === 'stego-scan' && stegoScanResult && (
                    <div className="p-6 text-center">
                      <div className="text-sm text-muted">Probabilidade</div>
                      <div className="text-4xl font-bold my-2" style={{ color: stegoScanResult.suspicious ? '#ff4444' : '#00cc00' }}>{stegoScanResult.score}%</div>
                      <ul className="text-left mt-4 space-y-2">
                        {stegoScanResult.indicators.map(i => <li key={i} className="text-xs text-yellow-400">• {i}</li>)}
                      </ul>
                    </div>
                  )}

                  {activeTool === 'stego-encode' && stegoEncodeResult?.image && (
                    <div className="text-center space-y-4">
                      <div className="text-green-400 text-sm font-bold">Mensagem Ocultada!</div>
                      <Image src={stegoEncodeResult.image} alt="Encoded" width={400} height={300} className="w-full max-w-[300px] mx-auto rounded border border-border-primary" unoptimized />
                      <a href={stegoEncodeResult.image} download="secret_image.png" className="btn btn-primary w-full">Baixar Imagem</a>
                    </div>
                  )}

                  {activeTool === 'stego-decode' && stegoDecodeResult && (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded">
                      <div className="text-xs text-green-400 mb-2 font-bold">MENSAGEM DECIFRADA (IMAGEM):</div>
                      <div className="text-lg text-white font-mono break-words">{stegoDecodeResult}</div>
                    </div>
                  )}

                  {activeTool === 'stego-audio-encode' && stegoAudioResult?.audio && (
                    <div className="text-center space-y-4">
                      <div className="text-green-400 text-sm font-bold">Mensagem Ocultada no Áudio!</div>
                      <audio src={stegoAudioResult.audio} controls className="w-full" />
                      <a href={stegoAudioResult.audio} download="secret_audio.wav" className="btn btn-primary w-full">Baixar Áudio WAV</a>
                    </div>
                  )}

                  {activeTool === 'stego-audio-decode' && stegoAudioDecodeResult && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded">
                      <div className="text-xs text-blue-400 mb-2 font-bold">MENSAGEM DECIFRADA NO ÁUDIO:</div>
                      <div className="text-lg text-white font-mono break-words">{stegoAudioDecodeResult}</div>
                    </div>
                  )}

                  {!file && (!activeTool || !activeTool.includes('osint')) && !metadataResult && !osintResult && (
                    <div className="flex flex-col items-center justify-center h-[200px] opacity-30">
                      <span style={{ fontSize: '3rem' }}>🧪</span>
                      <p className="text-sm mt-2">Aguardando análise...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
