# ⚠️ LEIA ANTES DE INTEGRAR — Correção do Visual DoMore

O app usa **dark mode forçado** como padrão (fundo #0A0A0F, neon #AAFF00).
Se o visual apareceu branco/claro, é porque estes arquivos não foram substituídos corretamente.

## Arquivos CRÍTICOS para o visual — substituir completamente:

| Arquivo | O que controla |
|---|---|
| `lib/theme-provider.tsx` | Estado inicial do tema (DEVE iniciar em "dark") |
| `tailwind.config.js` | Paleta de cores e darkMode: "class" |
| `global.css` | Variáveis CSS do tema |
| `app.config.ts` | userInterfaceStyle: "dark" |
| `app/(tabs)/_layout.tsx` | Tab bar preta com ícones neon |
| `theme.config.js` | Tokens de cor dark/light |

## Verificação rápida

Após integrar, o app deve mostrar:
- ✅ Fundo: #0A0A0F (preto profundo)
- ✅ Cards: #17171D (cinza escuro)
- ✅ Acento primário: #AAFF00 (neon verde)
- ✅ Tab bar: #13131A com ícones neon
- ✅ Textos: #F2F2FF (branco suave)

## Se ainda aparecer branco:

1. Confirmar que `lib/theme-provider.tsx` tem `useState<ColorScheme>("dark")` — NÃO `systemScheme`
2. Confirmar que `tailwind.config.js` tem `darkMode: 'class'`
3. Rodar `npx expo start --clear` para limpar cache do Metro
