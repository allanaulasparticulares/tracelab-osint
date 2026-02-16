'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

function LabContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTool = searchParams.get('tool') as ToolId | null;

  const [activeTool, setActiveTool] = useState<ToolId | null>(initialTool);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'All'>('All');

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
  const [progress, setProgress] = useState(0);

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
        if (!extracted.success || !extracted.metadata) throw new Error(extracted.error || 'Falha ao extrair metadados.');
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
        if (!secretText.trim()) throw new Error('Digite uma mensagem para ocultar.');
        const result = await encodePNG(file, secretText.trim(), password.trim() || undefined);
        if (!result.success) throw new Error(result.error);
        setStegoEncodeResult({ image: result.image, stats: result.stats });
      }
      if (activeTool === 'stego-decode') {
        const result = await decodePNG(file, password.trim() || undefined);
        if (!result.success) throw new Error(result.error || 'Nenhuma mensagem encontrada.');
        setStegoDecodeResult(result.data || '');
      }
      if (activeTool === 'stego-scan') {
        const result = await analyzePNG(file);
        setStegoScanResult(result);
      }
      if (activeTool === 'strings') {
        setProgress(0);
        const result = await extractStrings(file, minLength, { onProgress: (p) => setProgress(p) });
        setStringsResult(result);
        setProgress(100);
      }
      if (activeTool === 'bitplane') {
        setProgress(0);
        const result = await sliceBitPlanes(file, (p) => setProgress(p));
        setBitPlaneResult(result);
        setProgress(100);
      }
      if (activeTool === 'spectrogram') {
        const result = await generateSpectrogram(file);
        setSpectrogramResult(result);
      }
      if (activeTool === 'stego-audio-encode') {
        if (!secretText.trim()) throw new Error('Digite uma mensagem para ocultar.');
        const result = await encodeAudio(file, secretText.trim(), password.trim() || undefined);
        setStegoAudioResult(result);
      }
      if (activeTool === 'stego-audio-decode') {
        const result = await decodeAudio(file, password.trim() || undefined);
        setStegoAudioDecodeResult(result.data || '');
      }
      if (activeTool === 'hex') {
        const result = await readHexChunk(file, hexOffset, HEX_PAGE_SIZE);
        setHexResult(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no laboratório.');
    } finally {
      setBusy(false);
    }
  };

  const handleHexPage = async (direction: 'next' | 'prev') => {
    if (!file) return;
    let newOffset = hexOffset + (direction === 'next' ? HEX_PAGE_SIZE : -HEX_PAGE_SIZE);
    if (newOffset < 0) newOffset = 0;
    if (newOffset >= file.size) return;
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

  const categories: Array<ToolCategory | 'All'> = ['All', 'Analysis', 'Forensics', 'Steganography', 'OSINT'];

  return (
    <div className="lab-layout">
      <header className="lab-header-mobile">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>☰</button>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Image src="/logo_atual.png" alt="Logo" width={32} height={32} />
            <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>TraceLab</span>
          </Link>
        </div>
        <button
          onClick={() => { if (activeTool) setActiveTool(null); else router.back(); }}
          className="text-sm text-muted"
        >
          {activeTool ? 'Menu' : 'Voltar'}
        </button>
      </header>

      {isSidebarOpen && <div className="mobile-overlay visible" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`lab-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-primary)' }}>
          <Image src="/logo_atual.png" alt="TraceLab" width={32} height={32} />
          <h1 className="mono" style={{ fontSize: '1rem', fontWeight: 800 }}>TRACELAB</h1>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
          {categories.filter(c => c !== 'All').map(cat => (
            <div key={cat} style={{ marginBottom: '1.5rem' }}>
              <div className="tool-category">{cat}</div>
              <div style={{ display: 'grid', gap: '4px', padding: '0 0.75rem' }}>
                {tools.filter(t => t.category === cat).map(tool => (
                  <button
                    key={tool.id}
                    className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTool(tool.id);
                      setIsSidebarOpen(false);
                      clearToolResults();
                    }}
                  >
                    <span className="tool-icon">{tool.icon}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{tool.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="lab-main">
        <div className="container animate-in">
          <header style={{ marginBottom: '2rem' }}>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span style={{ fontSize: '2rem' }}>{selectedTool?.icon || '🧪'}</span>
              {selectedTool?.name || 'Central de Ferramentas'}
            </h2>
            <p className="text-muted">{selectedTool?.desc || 'Selecione uma especialidade forense abaixo para iniciar.'}</p>
          </header>

          {!activeTool ? (
            <div className="space-y-8">
              {/* Category Tabs for Mobile/Hub */}
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold uppercase transition-all ${activeCategory === cat ? 'bg-accent text-black border-accent' : 'bg-black/40 text-muted border-white/5'}`}
                    style={{ border: '1px solid' }}
                  >
                    {cat === 'All' ? 'Todas' : cat}
                  </button>
                ))}
              </div>

              {/* Hub Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tools.filter(t => activeCategory === 'All' || t.category === activeCategory).map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => { setActiveTool(tool.id); clearToolResults(); }}
                    className="glass flex items-start gap-4 p-5 rounded-2xl hover:border-accent transition-all text-left"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div style={{ fontSize: '2rem', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '16px' }}>{tool.icon}</div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#fff' }}>{tool.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{tool.desc}</div>
                      <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--accent-primary)', background: 'rgba(0, 229, 255, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>{tool.category}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="workspace-grid">
              {/* Same Workspace logic as before but with UI polish */}
              <div className="workspace-panel">
                <h3 className="text-xs font-black text-accent uppercase tracking-widest mb-4">Input</h3>
                {activeTool === 'osint-user' ? (
                  <div className="space-y-4">
                    <input type="text" className="input" placeholder="Username..." value={targetUsername} onChange={e => setTargetUsername(e.target.value)} />
                    <button className="btn btn-primary w-full" onClick={runTool} disabled={busy}>Rastrear</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="input-upload" style={{
                      border: '2px dashed rgba(255,255,255,0.1)',
                      borderRadius: '1rem', height: '140px', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', position: 'relative'
                    }}>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); clearToolResults(); } }} />
                      <span style={{ fontSize: '2rem' }}>{file ? '📄' : '📤'}</span>
                      <span className="text-sm mt-2">{file ? file.name : 'Selecione o arquivo'}</span>
                    </div>
                    <button className="btn btn-primary w-full" onClick={runTool} disabled={busy}>{busy ? 'Processando...' : 'Iniciar Análise'}</button>
                    <button className="btn btn-secondary w-full" onClick={() => { setFile(null); clearToolResults(); }}>Limpar</button>
                  </div>
                )}
                {error && <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">{error}</div>}
              </div>

              <div className="workspace-panel">
                <h3 className="text-xs font-black text-accent uppercase tracking-widest mb-4">Output</h3>
                <div className="result-content scrollbar-hide">
                  {/* Render results conditionally (same as before) */}
                  {activeTool === 'metadata' && metadataResult && (
                    <pre className="text-xs p-4 bg-black/30 rounded overflow-auto h-full">{JSON.stringify(metadataResult.metadata, null, 2)}</pre>
                  )}
                  {activeTool === 'osint-user' && osintResult && (
                    <div className="grid grid-cols-2 gap-2">
                      {osintResult.map(p => (
                        <a key={p.name} href={p.link} target="_blank" rel="noreferrer" className="p-3 bg-white/5 rounded text-xs text-center border border-white/5 hover:border-accent">
                          {p.name}
                        </a>
                      ))}
                    </div>
                  )}
                  {/* ... Hex, Strings, Spectrogram etc ... */}
                  {activeTool === 'hex' && hexResult && (
                    <div className="hex-container text-[10px] font-mono">
                      {hexResult.hex.map((line, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-muted">{(hexResult.offset + i * 16).toString(16).padStart(8, '0')}</span>
                          <span className="text-accent">{line}</span>
                          <span className="text-white opacity-50">{hexResult.ascii[i]}</span>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => handleHexPage('prev')} disabled={hexOffset === 0} className="btn btn-secondary p-1 px-4 text-[10px]">Prev</button>
                        <button onClick={() => handleHexPage('next')} className="btn btn-secondary p-1 px-4 text-[10px]">Next</button>
                      </div>
                    </div>
                  )}
                  {activeTool === 'spectrogram' && spectrogramResult?.spectrogram && (
                    <Image src={spectrogramResult.spectrogram} alt="Spec" width={1000} height={300} className="w-full rounded" unoptimized />
                  )}

                  {/* Fallback waiting state */}
                  {!file && (!activeTool || !activeTool.includes('osint')) && (
                    <div className="flex flex-col items-center justify-center h-48 opacity-20">
                      <span style={{ fontSize: '3rem' }}>🧪</span>
                      <p className="text-xs mt-2">Aguardando dados...</p>
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

export default function LabPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center mono text-accent">Inicializando Workbench...</div>}>
      <LabContent />
    </Suspense>
  );
}
