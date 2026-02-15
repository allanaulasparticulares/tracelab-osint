# Plano de Otimização Mobile - TraceLab OSINT

Este documento descreve as melhorias propostas para otimizar a experiência do usuário em dispositivos móveis, focando em usabilidade, performance e design responsivo.

## 1. Navegação (Mobile-First)

### Problema Atual
O menu de navegação atual (`header`) tenta exibir todos os links horizontalmente ou quebra de forma desordenada (`flex-wrap`) em telas pequenas, ocultando ou dificultando o acesso a links importantes.

### Solução Proposta
Implementar uma **Bottom Navigation Bar** (Barra de Navegação Inferior) para telas menores que 768px.
- **Ícones Chave:** Home, Lab, Desafios, Perfil.
- **Posição:** Fixa na parte inferior da tela.
- **Benefício:** Fácil alcance com o polegar (Thumb Zone).

Alternativamente, um **Menu Hambúrguer Lateral** para opções secundárias.

## 2. Dashboard Responsivo

### Dashboard - Cards de Estatísticas
- **Atual:** Grid que vira coluna única em mobile (`grid-template-columns: 1fr`).
- **Proposta:** Manter grid de 2 colunas (`grid-cols-2`) para métricas compactas ou usar um **Carrossel Horizontal** com snap-scroll para navegar entre os cards sem ocupar muito espaço vertical.

### Ferramentas e Desafios
- Os cards de ferramentas e desafios devem ter altura reduzida em mobile, focando no título e ícone, com a descrição truncada ou acessível via toque expandido.

## 3. Experiência de Login

### Passkey & Formulários
- Garantir que os inputs de email tenham `type="email"` e `autocomplete` corretos para facilitar a digitação.
- O botão de "Entrar com Passkey" deve ser o destaque principal, posicionado na zona de fácil alcance.

## 4. Otimizações de CSS (`globals.css`)

### Typography
- Ajustar tamanhos de fonte (`font-size`) em mobile para garantir legibilidade sem ocupar a tela inteira.
- `h1`: Reduzir de ~1.75rem para 1.5rem.
- `body`: Manter 16px (1rem) para evitar zoom automático em inputs no iOS.

### Touch Targets
- Garantir que todos os elementos interativos (botões, links) tenham área de toque mínima de **44x44px**.
- Aumentar o espaçamento (`gap`) entre links de texto para evitar toques acidentais.

### Animações
- Simplificar animações complexas (`box-shadow`, `blur`) em mobile para economizar bateria e melhorar FPS.
- Utilizar `will-change: transform, opacity` apenas onde estritamente necessário.

## 5. Exemplo de Código (Bottom Nav)

```tsx
// Componente sugerido: BottomNav.tsx
const BottomNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around p-3 z-50 md:hidden">
    <Link href="/dashboard" className="flex flex-col items-center text-xs text-gray-400 hover:text-cyan-400">
      <IconHome className="w-6 h-6 mb-1" />
      Início
    </Link>
    <Link href="/lab" className="flex flex-col items-center text-xs text-gray-400 hover:text-cyan-400">
      <IconLab className="w-6 h-6 mb-1" />
      Lab
    </Link>
    {/* Outros links */}
  </nav>
);
```

---
*Gerado por Antigravity (Google DeepMind) via análise de código manual.*
