'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { extractImageMetadata, type MetadataResult } from '@/lib/metadata/extractor';
import { analyzeIntegrity, type IntegrityResult } from '@/lib/forensics/integrity-check';
import { scanInconsistencies, type InconsistencyReport } from '@/lib/forensics/inconsistency-scanner';
import { performELA, type ELAResult } from '@/lib/forensics/ela-analysis';
import { analyzePNG, decodePNG, encodePNG } from '@/lib/steganography/png-stego';
import { extractStrings, type StringsResult } from '@/lib/forensics/strings-extractor';
import { sliceBitPlanes, type BitPlaneResult } from '@/lib/forensics/bit-plane-slicer';
import { readHexChunk, type HexChunk } from '@/lib/forensics/hex-viewer';
import { generateProfileLinks, type SocialPlatform } from '@/lib/osint/social-platforms';

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

  // Forensics
  { id: 'hex', name: 'Deep Hex Inspector', icon: '💾', desc: 'Análise binária (Hex/ASCII)', category: 'Forensics' },
  { id: 'strings', name: 'Strings Extractor', icon: '📝', desc: 'Busca de padrões de texto', category: 'Forensics' },
  { id: 'bitplane', name: 'Bit Plane Slicer', icon: '🍰', desc: 'Decomposição de camadas de bits', category: 'Forensics' },

  // Steganography
  { id: 'stego-scan', name: 'Stego Analyzer', icon: '🛰️', desc: 'Detecção estatística LSB', category: 'Steganography' },
  { id: 'stego-decode', name: 'Stego Decode', icon: '🗝️', desc: 'Extrair mensagem oculta', category: 'Steganography' },
  { id: 'stego-encode', name: 'Stego Encode', icon: '🧪', desc: 'Ocultar mensagem em imagem', category: 'Steganography' },

  // OSINT
  { id: 'osint-user', name: 'Social Sherlock', icon: '🕵️', desc: 'Rastreio de username em 30+ sites', category: 'OSINT' },
];

export default function LabPage() {
  const [activeTool, setActiveTool] = useState<ToolId>('metadata');
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

  const [metadataResult, setMetadataResult] = useState<MetadataResult | null>(null);
  const [integrityResult, setIntegrityResult] = useState<IntegrityResult | null>(null);
  const [inconsistencyResult, setInconsistencyResult] = useState<InconsistencyReport | null>(null);
  const [elaResult, setElaResult] = useState<ELAResult | null>(null);
  const [stegoEncodeResult, setStegoEncodeResult] = useState<{ image?: string; stats?: { capacity: number; used: number; efficiency: number } } | null>(null);
  const [stegoDecodeResult, setStegoDecodeResult] = useState<string>('');
  const [stegoScanResult, setStegoScanResult] = useState<{ suspicious: boolean; score: number; indicators: string[] } | null>(null);
  const [stringsResult, setStringsResult] = useState<StringsResult | null>(null);
  const [bitPlaneResult, setBitPlaneResult] = useState<BitPlaneResult | null>(null);
  const [osintResult, setOsintResult] = useState<Array<SocialPlatform & { link: string }> | null>(null);

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
    setInconsistencyResult(null);
    setElaResult(null);
    setStegoEncodeResult(null);
    setStegoDecodeResult('');
    setStegoScanResult(null);
    setStringsResult(null);
    setBitPlaneResult(null);
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

      if (activeTool === 'strings') {
        const result = await extractStrings(file, minLength);
        setStringsResult(result);
        if (!result.success) throw new Error(result.error);
      }

      if (activeTool === 'bitplane') {
        const result = await sliceBitPlanes(file);
        setBitPlaneResult(result);
        if (!result.success) throw new Error(result.error);
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
      <header className="lab-header-mobile">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            ☰
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Image src="/logo_atual.png" alt="Logo" width={32} height={32} />
            <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>TraceLab</span>
          </div>
        </div>
        <Link href="/dashboard" className="text-sm text-muted" style={{ textDecoration: 'none' }}>Sair</Link>
      </header>

      {/* Sidebar */}
      <aside className={`lab-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-primary)' }}>
          <Image src="/logo_atual.png" alt="TraceLab OSINT" width={40} height={40} />
          <div>
            <h1 className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>TraceLab</h1>
            <p className="text-xs text-muted">Forensic Workbench</p>
          </div>
        </div>

        <nav style={{ flex: 1, paddingBottom: '2rem' }}>
          {categories.map(cat => (
            <div key={cat}>
              <div className="tool-category">{cat}</div>
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
                  <span>{tool.name}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-primary)' }}>
          <Link href="/dashboard" className="tool-btn" style={{ paddingLeft: 0 }}>
            <span className="tool-icon">🏠</span>
            <span>Voltar ao Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lab-main">
        <div className="container animate-in">
          <header style={{ marginBottom: '2rem' }}>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span style={{ fontSize: '2rem' }}>{selectedTool?.icon}</span>
              {selectedTool?.name}
            </h2>
            <p className="text-muted" style={{ marginTop: '0.5rem' }}>{selectedTool?.desc}</p>
          </header>

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
                      accept={(activeTool === 'strings' || activeTool === 'hex' || activeTool === 'integrity') ? '*/*' : 'image/*'}
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

              {/* Tool Specific Controls */}
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

                {(activeTool === 'stego-encode') && (
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
                {(activeTool === 'stego-decode') && (
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

              {/* Default Preview */}
              {previewUrl && !activeTool.match(/hex|strings|integrity|osint-user/) && (
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

              {/* Result Content Area */}
              <div className="result-content">
                {/* Metadata */}
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

                {/* OSINT */}
                {activeTool === 'osint-user' && osintResult && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                    {osintResult.map(p => (
                      <a
                        key={p.name}
                        href={p.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="card"
                        style={{ padding: '0.75rem', textDecoration: 'none', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <span className="font-bold text-sm text-white">{p.name}</span>
                        <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">{p.category}</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Hex Viewer */}
                {activeTool === 'hex' && hexResult && (
                  <div>
                    <div className="flex justify-between items-center mb-4 text-xs font-mono text-accent">
                      <span>OFFSET: {hexResult.offset.toString(16).toUpperCase()}</span>
                      <div className="flex gap-2">
                        <button className="btn btn-secondary py-1 px-3 text-xs" onClick={() => handleHexPage('prev')} disabled={hexOffset === 0}>ANTERIOR</button>
                        <button className="btn btn-secondary py-1 px-3 text-xs" onClick={() => handleHexPage('next')}>PRÓXIMO</button>
                      </div>
                    </div>
                    <div className="overflow-x-auto bg-black/40 p-2 rounded border border-border-primary">
                      <table className="hex-table">
                        <tbody>
                          {hexResult.hex.map((line, i) => (
                            <tr key={i}>
                              <td className="hex-offset">{((hexResult.offset + i * 16).toString(16)).padStart(8, '0').toUpperCase()}</td>
                              <td className="text-green-400 whitespace-pre font-mono">{line}</td>
                              <td className="hex-ascii whitespace-pre">{hexResult.ascii[i]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Bit Plane */}
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

                {/* Strings */}
                {activeTool === 'strings' && stringsResult && (
                  <div>
                    <div className="text-sm text-accent mb-2">Strings encontradas: {stringsResult.totalFound}</div>
                    <pre className="text-xs p-4 bg-black/30 rounded overflow-auto max-h-[500px] whitespace-pre-wrap text-green-400 font-mono">
                      {stringsResult.strings?.join('\n')}
                    </pre>
                  </div>
                )}

                {/* Integrity */}
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
                    {integrityResult.warnings && integrityResult.warnings.length > 0 && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
                        <div className="text-xs font-bold text-red-400 mb-2">Avisos de Integridade:</div>
                        {integrityResult.warnings.map(w => <div key={w} className="text-xs text-red-300">• {w}</div>)}
                      </div>
                    )}
                  </div>
                )}

                {/* Inconsistency */}
                {activeTool === 'inconsistency' && inconsistencyResult && (
                  <div className="space-y-4">
                    <div className={`p-4 rounded border ${inconsistencyResult.score > 50 ? 'border-red-500 bg-red-500/10' : 'border-green-500 bg-green-500/10'}`}>
                      <div className="text-xs text-muted">Risco Geral</div>
                      <div className="text-2xl font-bold">{inconsistencyResult.overallRisk.toUpperCase()} ({inconsistencyResult.score}/100)</div>
                    </div>
                    <pre className="text-xs p-4 bg-black/30 rounded overflow-auto max-h-[400px]">
                      {JSON.stringify(inconsistencyResult.inconsistencies.slice(0, 8), null, 2)}
                    </pre>
                  </div>
                )}

                {/* ELA */}
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

                {/* Stego Encode/Decode/Scan */}
                {activeTool === 'stego-scan' && stegoScanResult && (
                  <div className="p-6 text-center">
                    <div className="text-sm text-muted">Probabilidade</div>
                    <div className="text-4xl font-bold my-2" style={{ color: stegoScanResult.suspicious ? '#ff4444' : '#00cc00' }}>{stegoScanResult.score}%</div>
                    <div className="text-xs text-muted">{stegoScanResult.suspicious ? 'Alta probabilidade de esteganografia' : 'Baixa probabilidade'}</div>
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
                    <div className="text-xs text-green-400 mb-2 font-bold">MENSAGEM DECIFRADA:</div>
                    <div className="text-lg text-white font-mono break-words">{stegoDecodeResult}</div>
                  </div>
                )}

                {!file && !activeTool.includes('osint') && !metadataResult && !osintResult && (
                  <div className="flex flex-col items-center justify-center h-[200px] opacity-30">
                    <span style={{ fontSize: '3rem' }}>🧪</span>
                    <p className="text-sm mt-2">Aguardando análise...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
