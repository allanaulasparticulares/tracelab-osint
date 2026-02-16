'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setPasskeySupported(!!window.PublicKeyCredential && !!navigator.credentials);

    // Se estiver logado, vai direto pro dashboard
    if (document.cookie.includes('tracelab_session')) {
      router.replace('/dashboard');
    }
  }, [router]);

  const registerPasskey = async () => {
    resetMessages();
    if (!passkeySupported) {
      setError('Este navegador nao suporta Passkeys/WebAuthn.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Informe um email valido.');
      return;
    }

    setLoading(true);
    try {
      const optionsRes = await fetch('/api/auth/passkey/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizeEmail(email),
          displayName: displayName.trim() || normalizeEmail(email),
        }),
      });
      const optionsData = await optionsRes.json();
      if (!optionsRes.ok || !optionsData?.success) {
        throw new Error(optionsData?.error || 'Falha ao iniciar registro de passkey.');
      }

      const publicKey = normalizeCreationOptions(optionsData.publicKey);
      const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
      if (!credential) throw new Error('Registro de passkey foi cancelado.');

      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKeySpki = response.getPublicKey();
      if (!publicKeySpki) throw new Error('Nao foi possivel extrair chave publica do autenticador.');

      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizeEmail(email),
          displayName: displayName.trim() || normalizeEmail(email),
          credentialId: toBase64Url(credential.rawId),
          clientDataJson: toBase64Url(response.clientDataJSON),
          publicKeySpki: toBase64Url(publicKeySpki),
          algorithm: response.getPublicKeyAlgorithm(),
          transports: response.getTransports(),
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData?.success) {
        throw new Error(verifyData?.error || 'Falha ao finalizar registro da passkey.');
      }

      if (typeof window !== 'undefined') {
        const preferredName = displayName.trim() || normalizeEmail(email).split('@')[0];
        persistUserIdentity(preferredName, normalizeEmail(email));
        window.localStorage.setItem('tracelab_user_email', normalizeEmail(email));
      }

      setInfo('Passkey registrada com sucesso.');
    } catch (err) {
      setError(mapWebAuthnError(err, 'register'));
    } finally {
      setLoading(false);
    }
  };

  const loginWithPasskey = async () => {
    resetMessages();
    if (!passkeySupported) {
      setError('Este navegador nao suporta Passkeys/WebAuthn.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Informe um email valido.');
      return;
    }

    setLoading(true);
    try {
      const optionsRes = await fetch('/api/auth/passkey/login/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizeEmail(email) }),
      });
      const optionsData = await optionsRes.json();
      if (!optionsRes.ok || !optionsData?.success) {
        throw new Error(optionsData?.error || 'Falha ao iniciar login com passkey.');
      }

      const publicKey = normalizeRequestOptions(optionsData.publicKey);
      const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
      if (!assertion) throw new Error('Autenticacao com passkey cancelada.');

      const response = assertion.response as AuthenticatorAssertionResponse;
      const verifyRes = await fetch('/api/auth/passkey/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizeEmail(email),
          displayName: displayName.trim() || String(optionsData?.userDisplayName || '').trim(),
          credentialId: toBase64Url(assertion.rawId),
          authenticatorData: toBase64Url(response.authenticatorData),
          clientDataJson: toBase64Url(response.clientDataJSON),
          signature: toBase64Url(response.signature),
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData?.success) {
        throw new Error(verifyData?.error || 'Falha ao validar assinatura da passkey.');
      }

      if (typeof window !== 'undefined') {
        const preferredName =
          String(verifyData?.displayName || '').trim() ||
          displayName.trim() ||
          String(optionsData?.userDisplayName || '').trim() ||
          normalizeEmail(email).split('@')[0];
        persistUserIdentity(preferredName, normalizeEmail(email));
      }

      setInfo('Autenticacao aprovada. Redirecionando...');
      window.location.href = '/dashboard';
    } catch (err) {
      setError(mapWebAuthnError(err, 'login'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid-background" style={{ background: 'var(--bg-primary)' }}>
      <div style={{ position: 'fixed', top: '10%', left: '5%', width: '300px', height: '300px', background: 'rgba(168, 85, 247, 0.07)', borderRadius: '50%', filter: 'blur(80px)' }} />
      <div style={{ position: 'fixed', bottom: '10%', right: '5%', width: '400px', height: '400px', background: 'rgba(0, 229, 255, 0.07)', borderRadius: '50%', filter: 'blur(80px)' }} />

      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: 'clamp(1.5rem, 4vw, 2rem) 1rem', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ width: '100%', maxWidth: '560px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 'clamp(1rem, 3vw, 1.25rem)' }}>
              <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 'clamp(0.5rem, 2vw, 0.75rem)', justifyContent: 'center' }}>
                <Image src="/logo_atual.png" alt="TraceLab OSINT" width={96} height={96} style={{ width: 'clamp(60px, 15vw, 96px)', height: 'clamp(60px, 15vw, 96px)', objectFit: 'contain' }} />
                <span className="mono" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', fontWeight: 700, color: 'var(--accent-primary)', lineHeight: 1.2 }}>
                  TraceLab
                </span>
              </Link>
              <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.8rem, 2vw, 0.875rem)', marginTop: '0.75rem', lineHeight: 1.4 }}>
                Login com Passkey (WebAuthn)
              </p>
            </div>

            <div className="glass" style={{ borderRadius: 'clamp(0.75rem, 2vw, 1rem)', padding: 'clamp(1.1rem, 3vw, 1.5rem)', border: '1px solid var(--border-primary)' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: 'clamp(0.75rem, 2vw, 0.8rem)', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="input"
                  disabled={loading}
                  style={{ fontSize: '16px' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: 'clamp(0.75rem, 2vw, 0.8rem)', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Nome de exibição (opcional)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Analista"
                  className="input"
                  disabled={loading}
                  style={{ fontSize: '16px' }}
                />
              </div>

              {error && (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(255, 0, 170, 0.1)',
                    border: '1px solid rgba(255, 0, 170, 0.3)',
                    marginBottom: '0.8rem'
                  }}
                >
                  <p style={{ fontSize: '0.8rem', color: '#ff5dc3' }}>❌ {error}</p>
                </div>
              )}

              {info && (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(0, 229, 255, 0.12)',
                    border: '1px solid rgba(0, 229, 255, 0.35)',
                    marginBottom: '0.8rem'
                  }}
                >
                  <p style={{ fontSize: '0.8rem', color: '#67e8f9' }}>✅ {info}</p>
                </div>
              )}

              <div style={{ display: 'grid', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={loginWithPasskey}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: 'clamp(0.875rem, 2.5vw, 1rem)', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}
                >
                  {loading ? '⏳ Autenticando...' : '🔐 Entrar com Passkey'}
                </button>
                <button
                  type="button"
                  onClick={registerPasskey}
                  disabled={loading}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: 'clamp(0.875rem, 2.5vw, 1rem)', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}
                >
                  {loading ? '⏳ Registrando...' : '➕ Registrar Passkey'}
                </button>
              </div>

              {hydrated && !passkeySupported && (
                <p style={{ fontSize: '0.74rem', color: '#ff5dc3', textAlign: 'center', marginTop: '0.8rem' }}>
                  Este navegador não suporta Passkeys/WebAuthn.
                </p>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.2rem', paddingBottom: 'clamp(1rem, 3vw, 2rem)' }}>
              <button
                onClick={() => router.back()}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 'clamp(0.75rem, 2vw, 0.85rem)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'color 0.2s'
                }}
              >
                ← Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function resetMessages() {
    setError('');
    setInfo('');
  }
}

function normalizeCreationOptions(publicKey: {
  challenge: string;
  user: { id: string; name: string; displayName: string };
  excludeCredentials: Array<{ id: string; type: PublicKeyCredentialType }>;
  rp: PublicKeyCredentialRpEntity;
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout: number;
  attestation: AttestationConveyancePreference;
  authenticatorSelection: AuthenticatorSelectionCriteria;
}): PublicKeyCredentialCreationOptions {
  return {
    ...publicKey,
    challenge: fromBase64Url(publicKey.challenge),
    user: {
      ...publicKey.user,
      id: fromBase64Url(publicKey.user.id),
    },
    excludeCredentials: publicKey.excludeCredentials.map((credential) => ({
      ...credential,
      id: fromBase64Url(credential.id),
    })),
  };
}

function normalizeRequestOptions(publicKey: {
  challenge: string;
  timeout: number;
  rpId: string;
  userVerification: UserVerificationRequirement;
  allowCredentials: Array<{
    id: string;
    type: PublicKeyCredentialType;
    transports?: AuthenticatorTransport[];
  }>;
}): PublicKeyCredentialRequestOptions {
  return {
    ...publicKey,
    challenge: fromBase64Url(publicKey.challenge),
    allowCredentials: publicKey.allowCredentials.map((credential) => ({
      ...credential,
      id: fromBase64Url(credential.id),
    })),
  };
}

function toBase64Url(input: ArrayBuffer): string {
  const bytes = new Uint8Array(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function persistUserIdentity(name: string, email: string): void {
  const safeName = name.trim() || email.split('@')[0] || 'Investigador';
  window.localStorage.setItem('tracelab_user_name', safeName);
  window.localStorage.setItem('tracelab_user_email', email);
  document.cookie = `tracelab_user_name=${encodeURIComponent(safeName)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

function mapWebAuthnError(error: unknown, mode: 'register' | 'login'): string {
  const fallback =
    mode === 'register' ? 'Erro no registro da passkey.' : 'Erro ao autenticar com passkey.';

  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      if (mode === 'register') {
        return 'Operacao cancelada, expirada ou bloqueada pelo dispositivo. Tente novamente e confirme biometria/PIN.';
      }
      return 'Login cancelado/expirado ou sem passkey valida neste dispositivo. Registre a passkey primeiro e tente de novo.';
    }
    if (error.name === 'InvalidStateError') {
      return 'Esta passkey ja parece cadastrada neste dispositivo para esta conta.';
    }
    if (error.name === 'SecurityError') {
      return 'Ambiente invalido para WebAuthn. Use HTTPS (ou localhost) e dominio configurado corretamente.';
    }
    if (error.name === 'AbortError') {
      return 'Operacao abortada pelo navegador/dispositivo. Tente novamente.';
    }
  }

  if (error instanceof Error) return error.message;
  return fallback;
}
