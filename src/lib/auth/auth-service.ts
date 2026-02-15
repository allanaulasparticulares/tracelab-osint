/**
 * Authentication Service - TraceLab OSINT
 * 
 * Sistema de autenticação:
 * - Login tradicional (identificado)
 * 
 * Filosofia: Segurança sem vigilância
 */

import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

export interface AuthResult {
    success: boolean;
    token?: string;
    refreshToken?: string;
    user?: {
        id: string;
        email: string;
        name: string;
    };
    error?: string;
}

export interface TokenPayload {
    userId: string;
    email: string;
    type: 'access' | 'refresh';
}

/**
 * Registra novo usuário
 */
export async function registerUser(
    email: string,
    _password: string,
    name: string
): Promise<AuthResult> {
    try {
        // Validar senha forte
        const passwordValidation = validatePassword(_password);
        if (!passwordValidation.valid) {
            return {
                success: false,
                error: passwordValidation.error
            };
        }

        // Validar email
        if (!isValidEmail(email)) {
            return {
                success: false,
                error: 'Email inválido'
            };
        }

        // Aqui você integraria com Prisma para salvar no banco
        // (incluindo hash de senha); este serviço ainda está em modo mock.
        // Por enquanto, retornando estrutura de exemplo
        const userId = crypto.randomUUID();

        // Gerar tokens
        const token = generateAccessToken(userId, email);
        const refreshToken = generateRefreshToken(userId, email);

        return {
            success: true,
            token,
            refreshToken,
            user: {
                id: userId,
                email,
                name
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao registrar usuário'
        };
    }
}

/**
 * Login de usuário autenticado
 */
export async function loginUser(
    email: string,
    password: string
): Promise<AuthResult> {
    try {
        // Aqui você buscaria o usuário no banco via Prisma
        // Por enquanto, exemplo de estrutura

        // Simular busca de usuário
        // const user = await prisma.user.findUnique({ where: { email } });

        // Validação mock enquanto não há persistência real de usuários.
        const isValidPassword = password === 'example';

        if (!isValidPassword) {
            return {
                success: false,
                error: 'Email ou senha incorretos'
            };
        }

        const userId = crypto.randomUUID();
        const token = generateAccessToken(userId, email);
        const refreshToken = generateRefreshToken(userId, email);

        // Atualizar lastLoginAt no banco
        // await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });

        return {
            success: true,
            token,
            refreshToken,
            user: {
                id: userId,
                email,
                name: 'User Name'
            }
        };
    } catch {
        return {
            success: false,
            error: 'Erro ao fazer login'
        };
    }
}

/**
 * Valida token de acesso
 */
export function verifyAccessToken(token: string): TokenPayload | null {
    return verifySignedToken<TokenPayload>(token);
}

/**
 * Renova token usando refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthResult> {
    const decoded = verifySignedToken<TokenPayload>(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
        return {
            success: false,
            error: 'Refresh token inválido ou expirado'
        };
    }

    // Verificar se refresh token existe no banco e não foi revogado
    // const session = await prisma.session.findUnique({ where: { refreshToken } });

    const newToken = generateAccessToken(decoded.userId, decoded.email);

    return {
        success: true,
        token: newToken
    };
}

/**
 * Revoga sessão (logout)
 */
export async function revokeSession(token: string): Promise<boolean> {
    try {
        const decoded = verifyAccessToken(token);
        if (!decoded) return false;

        // Sessão autenticada
        // await prisma.session.deleteMany({ where: { userId: decoded.userId } });

        return true;
    } catch {
        return false;
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function generateAccessToken(userId: string, email: string): string {
    return signToken({ userId, email, type: 'access' } as TokenPayload, JWT_EXPIRES_IN);
}

function generateRefreshToken(userId: string, email: string): string {
    return signToken({ userId, email, type: 'refresh' } as TokenPayload, REFRESH_TOKEN_EXPIRES_IN);
}

function signToken(payload: TokenPayload, expiresIn: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const exp = now + parseDurationToSeconds(expiresIn);
    const body = { ...payload, iat: now, exp };

    const encodedHeader = encodeBase64Url(JSON.stringify(header));
    const encodedBody = encodeBase64Url(JSON.stringify(body));
    const signature = signTokenParts(encodedHeader, encodedBody);

    return `${encodedHeader}.${encodedBody}.${signature}`;
}

function verifySignedToken<T>(token: string): T | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedBody, signature] = parts;
    const expectedSignature = signTokenParts(encodedHeader, encodedBody);

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

    try {
        const payload = JSON.parse(decodeBase64Url(encodedBody)) as T & { exp?: number };
        if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
            return null;
        }

        return payload as T;
    } catch {
        return null;
    }
}

function signTokenParts(encodedHeader: string, encodedBody: string): string {
    return crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${encodedHeader}.${encodedBody}`)
        .digest('base64url');
}

function encodeBase64Url(value: string): string {
    return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
}

function parseDurationToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/i);
    if (!match) return 0;

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();

    if (unit === 's') return value;
    if (unit === 'm') return value * 60;
    if (unit === 'h') return value * 60 * 60;
    if (unit === 'd') return value * 60 * 60 * 24;

    return 0;
}

function validatePassword(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) {
        return { valid: false, error: 'Senha deve ter no mínimo 8 caracteres' };
    }

    if (!/[A-Z]/.test(password)) {
        return { valid: false, error: 'Senha deve conter pelo menos uma letra maiúscula' };
    }

    if (!/[a-z]/.test(password)) {
        return { valid: false, error: 'Senha deve conter pelo menos uma letra minúscula' };
    }

    if (!/[0-9]/.test(password)) {
        return { valid: false, error: 'Senha deve conter pelo menos um número' };
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
        return { valid: false, error: 'Senha deve conter pelo menos um caractere especial' };
    }

    return { valid: true };
}

function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Proteção contra brute force
 */
export class BruteForceProtection {
    private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
    private readonly MAX_ATTEMPTS = 5;
    private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutos

    checkAttempt(identifier: string): boolean {
        const now = Date.now();
        const record = this.attempts.get(identifier);

        if (!record) {
            this.attempts.set(identifier, { count: 1, lastAttempt: now });
            return true;
        }

        // Resetar se janela expirou
        if (now - record.lastAttempt > this.WINDOW_MS) {
            this.attempts.set(identifier, { count: 1, lastAttempt: now });
            return true;
        }

        // Incrementar tentativas
        record.count++;
        record.lastAttempt = now;

        return record.count <= this.MAX_ATTEMPTS;
    }

    reset(identifier: string): void {
        this.attempts.delete(identifier);
    }
}
