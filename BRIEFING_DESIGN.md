# FinanceFlow — Briefing de Design

App pessoal de finanças em React Native + Expo SDK 54 + NativeWind + Zustand.

## Identidade visual

**Estilo DoMore — dark first, neon accent**. Não é flat minimalista, não é glassmorphism, não é iOS-like. É um dashboard moderno e denso, com tipografia pesada, acentos neon e cards escuros bem delineados.

### Paleta completa (fixa, não alterar)

```
/* Brand */
--neon:       #AAFF00   /* verde neon — acento principal, CTAs, valores destacados */
--neon-dim:   rgba(170,255,0,0.12)

/* Backgrounds */
--bg:         #0A0A0F   /* fundo do app, quase preto */
--surface:    #17171D   /* cards primários */
--surface2:   #1E1E26   /* cards secundários, headers de tabela */
--card:       #1A1A22
--card2:      #20202A

/* Texts */
--text:       #F2F2FF   /* títulos, valores principais */
--text2:      #C8C8E0   /* corpo de texto */
--muted:      #7A7A96   /* labels, subtítulos, metadados */
--muted2:     #4A4A62   /* texto muito dim, footers */

/* Borders */
--border:     #252530   /* divisões, outlines */
--border2:    #303040

/* Finance semantic (IMPORTANTE — sempre essas cores para entradas/saídas) */
--income:     #00E5A0   /* verde água — entradas */
--expense:    #FF6060   /* vermelho coral — despesas */
--savings:    #C084FC   /* roxo — reservas/metas */
--credit:     #FFBB45   /* âmbar — crédito, alertas */
```

### Tipografia

- Sistema: `-apple-system, "Segoe UI", Roboto`
- Valores monetários sempre em `ui-monospace, "SF Mono", Monaco, monospace`
- Pesos usados: `500` (textos normais), `700` (subtítulos), `900` (títulos, valores, CTAs). Nunca use 400 ou 600.
- Letter-spacing negativo em títulos grandes: `-0.5` a `-3px` dependendo do tamanho
- Letter-spacing positivo em labels UPPERCASE: `1px` a `2px`
- Labels de seção: sempre UPPERCASE + `letter-spacing: 1.5px` + `font-size: 10-11px` + cor `muted` ou `text2`

### Cards

Padrão: `background: #17171D`, `border: 1px solid #252530`, `borderRadius: 14-18px`, `padding: 14-18px`. Nunca sombras, nunca gradientes para corpo de card.

Accent strip: barra colorida de 3px no topo do card quando ele precisa indicar categoria (entrada verde, saída vermelha, reserva roxa, crédito âmbar, destaque neon).

### Botões e CTAs

- Primário (neon): `background: #AAFF00`, `color: #0A0A0F`, `borderRadius: 14px`, `fontWeight: 900`, `letter-spacing: 0.5px`
- Secundário: fundo `surface`, borda `border`, texto `text`
- Ghost/texto: só cor neon ou muted, sem fundo

### Componentes específicos

- **Pills de seleção de mês**: pill ativo em neon com texto preto 900, inativos em `surface` com borda `border` e texto `text2`
- **Barras de progresso**: background `border` (#252530), fill com cor semântica, altura 4-6px, `borderRadius: 3px`
- **Badges de status**: `rgba(cor,0.12)` de fundo com texto na cor sólida
- **Anéis de score (SVG)**: track em `#252530`, fill em cor semântica, largura 10px, `strokeLinecap: round`

## Arquitetura de estado

Zustand store combinado com slices separados:
- `finance-slice` (meses, transações, despesas, metas)
- `budget-slice` (orçamentos por categoria)
- `theme-slice` (preferência de tema persistida)
- `sync-slice` (estado de sincronização Google Drive)
- `ui-slice` (modais, hideBalances)

Persistência via `SecureStorage` (wrapper criptografado AES-256-GCM sobre AsyncStorage).

## Decisões de UX importantes

1. **Dark mode forçado por padrão** — `ThemeProvider` inicia em `"dark"`, ignora preferência do sistema. Usuário pode trocar em Settings.
2. **Fallback do `useColors()` é `"dark"`**, nunca `"light"` (isso causou todos os bugs visuais anteriores).
3. **Linguagem simples** na UI voltada ao usuário. Zero jargão técnico (sem "OAuth", "sync", "backup" — usar "salvar na nuvem", "entrar com Google", etc).
4. **Valores monetários sempre em BRL** formatado: `R$ 1.234,56` com separador de milhar.
5. **Emojis funcionam como ícones** em labels de categoria, KPIs e seções — não são decorativos, são parte do sistema.

## Telas principais

1. **Dashboard (Início)** — saudação + seletor de mês + saldo grande em neon + 4 summary cards coloridos + card de Saúde Financeira clicável + Uso do Orçamento + Projeção 90d + Insights + Despesas Fixas resumidas
2. **Transações (Despesas)** — header com total + seletor de mês + filtro por categoria + lista agrupada por data com swipe-to-delete
3. **Fixas** — progresso de pagamento + lista de fixas pendentes e pagas com toggle
4. **Entradas** — total + lista de fontes de renda com barras proporcionais
5. **Metas** — reserva de emergência + meta pessoal com anéis de progresso
6. **Score** (modal) — anel grande + 5 dimensões com barras coloridas
7. **Orçamentos** (modal) — envelope method por categoria
8. **Settings** — perfil + aparência (3 opções de tema) + segurança + notificações + Google Drive
9. **Exportar relatório** — seletor de período + formato CSV/PDF + preview

## O que NÃO fazer

- Não usar azul/branco/pastel do tema antigo
- Não usar gradientes em cards ou fundos (só em barras de progresso finas)
- Não usar sombras em nenhum lugar
- Não usar Title Case — usar "Despesas variáveis" não "Despesas Variáveis"
- Não usar emoji fora do sistema definido (📊 💰 💸 🎯 ⚡ 🛡️ ✅ 💡 ⚠️)
- Não colocar ícones FontAwesome ou Material Icons — usar lucide-react-native
- Não usar `colors.foreground` dinâmico em textos que precisam ser sempre visíveis — hardcode `#F2F2FF`
