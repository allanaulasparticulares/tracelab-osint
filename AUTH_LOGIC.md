# Lógica de Autenticação (Atual)

1. **Login por Passkey (WebAuthn)**  
`src/app/login/page.tsx:94` chama `/api/auth/passkey/login/options` e depois `/api/auth/passkey/login/verify`.  
No backend, valida challenge/origin/rpId e assinatura do autenticador em `src/app/api/auth/passkey/login/verify/route.ts:32`.

2. **Criação de sessão stateless em cookie**  
Após validar a passkey, cria token de sessão em `src/lib/server/session-store.ts:18` (`createSession`) e grava cookie `tracelab_session` em `src/app/api/auth/passkey/login/verify/route.ts:101`.  
Esse token é um payload assinado com HMAC-SHA256 (`signSession`/`verifySession`) em `src/lib/server/session-store.ts:78` e `src/lib/server/session-store.ts:88`.

3. **Proteção de páginas**  
O `middleware` exige existência do cookie para rotas protegidas (`/lab`, `/dashboard`, etc.) em `middleware.ts:26` e `middleware.ts:58`; sem cookie redireciona para `/login` em `middleware.ts:29`.

4. **Validação real da sessão nas APIs**  
As rotas de API protegidas usam `getSession` para validar assinatura + expiração (`src/lib/server/session-store.ts:33`).  
Ex.: `src/app/api/progress/summary/route.ts:16`, `src/app/api/progress/track/route.ts:16`.

5. **Renovação de sessão por atividade**  
`/api/auth/session/ping` faz `touchSession` e reemite cookie com mais 30 dias em `src/app/api/auth/session/ping/route.ts:15` e `src/app/api/auth/session/ping/route.ts:22`.

6. **Logout**  
Limpa cookies em `src/app/api/auth/logout/route.ts:14`. `revokeSession` hoje é no-op (por ser stateless) em `src/lib/server/session-store.ts:65`.

## Observações

- **OTP está desativado** (`410`) em `src/app/api/auth/request-otp/route.ts:7` e `src/app/api/auth/verify-otp/route.ts:7`.  
- `src/lib/auth/auth-service.ts` parece **legado/mock** e não está sendo usado no fluxo atual.
