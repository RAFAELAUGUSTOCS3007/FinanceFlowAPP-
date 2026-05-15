# FinanceFlow - TODO

## Setup & Configuração
- [x] Configurar tema de cores (verde, vermelho, roxo, amarelo)
- [x] Configurar estrutura de abas (5 tabs)
- [x] Configurar ícones de abas no icon-symbol.tsx
- [x] Gerar logo do app

## Banco de Dados & Contexto
- [x] Criar schema do banco de dados (AsyncStorage)
- [x] Criar contexto de dados financeiros (FinanceContext)
- [x] Implementar funções CRUD para transações
- [x] Implementar funções CRUD para despesas fixas
- [x] Implementar funções CRUD para entradas
- [x] Implementar funções CRUD para reservas
- [x] Implementar funções CRUD para configurações do usuário
- [x] Pré-popular com dados de Março 2026 da planilha

## Tela: Dashboard (Home)
- [x] Header com saudação personalizada e data
- [x] Card principal de saldo disponível (positivo/negativo)
- [x] Grid de cards de resumo (Entradas, Saídas, Crédito, Reservas)
- [x] Barra de progresso "Uso do Orçamento"
- [x] Gráfico de pizza de categorias
- [x] FAB (botão flutuante) para adicionar transação
- [x] Seletor de mês no topo
- [x] Últimas transações
- [x] Despesas fixas pendentes

## Tela: Transações (Despesas Variáveis)
- [x] Lista de transações com FlatList
- [x] Filtro por categoria
- [x] Long press para deletar
- [x] Modal de adição de transação
- [x] Categorias com emojis

## Tela: Despesas Fixas
- [x] Lista de despesas fixas
- [x] Toggle pago/pendente com haptic
- [x] Progresso total pago vs planejado
- [x] Modal de adição de despesa fixa
- [x] Indicador de valor real vs planejado

## Tela: Entradas
- [x] Lista de fontes de renda
- [x] Porcentagem de cada entrada no total
- [x] Modal de adição/edição de entrada

## Tela: Metas & Reservas
- [x] Card de reserva de emergência com progresso
- [x] Card de meta pessoal com progresso
- [x] Registro de reserva mensal
- [x] Histórico de reservas por mês

## Tela: Configurações
- [x] Nome e pronomes do usuário
- [x] Configuração de meta pessoal (nome e valor)
- [x] Configuração de reserva de emergência (valor alvo)
- [x] Toggle tema claro/escuro

## Componentes Compartilhados
- [x] MoneyText (formatação BRL)
- [x] ProgressBar
- [x] CategoryBadge
- [x] SummaryCard
- [x] MonthSelector

## Branding
- [x] Gerar ícone do app
- [x] Configurar splash screen
- [x] Atualizar app.config.ts com nome e logo

## Correções & Melhorias
- [x] Remover console.log desnecessário do ThemeProvider
- [x] Adicionar tokens de cor financeiros (income/expense/savings/credit) ao ThemeProvider
- [x] Corrigir indentação do FinanceProvider no _layout.tsx

## Melhorias - Pacote A (Correções e Usabilidade)
- [x] Corrigir bug do botão "Resetar todos os dados" (dispatch RESET_STATE)
- [x] Swipe-to-delete em transações variáveis
- [x] Swipe-to-delete em despesas fixas
- [x] Swipe-to-delete em entradas
- [x] Edição de transações variáveis existentes (modal pré-preenchido)
- [x] Seletor de data com calendário nativo (DateTimePicker)

## Melhorias - Pacote B (Visual Premium)
- [x] Tela de boas-vindas animada (splash personalizado com logo)
- [x] Onboarding de 3 telas no primeiro acesso
- [x] Header do Dashboard com gradiente e saudação personalizada
- [x] Botão ocultar/mostrar saldo no Dashboard
- [x] Microanimações nos cards do Dashboard (slide up + fade)

## Melhorias - Pacote C (Funcionalidades Avançadas)
- [x] Tela dedicada de Cartão de Crédito (limite, fatura, disponível)
- [x] Transações recorrentes / opção "Repetir todo mês" nas despesas fixas
- [x] Busca por texto e filtros avançados nas transações
- [x] Duplicar mês anterior (copiar despesas fixas e entradas)
- [x] Indicador de saúde financeira no Dashboard

## Melhorias - Pacote D (Segurança e Integrações)
- [x] Notificações locais de despesas fixas pendentes
- [x] Autenticação biométrica (Face ID / Digital)
- [x] Exportar relatório mensal em PDF
- [x] Toggle de tema claro/escuro nas Configurações
- [x] Botão de exportar PDF nas Configurações e no Dashboard (Ações Rápidas)

## Correção de Build (APK / Publish)
- [x] Identificar e corrigir erros que impedem o build de produção
- [x] Corrigir versões incompatíveis com Expo SDK 54 (expo-linear-gradient, expo-local-authentication, expo-print, expo-sharing, expo-notifications, datetimepicker, react-navigation)
- [x] Converter ícones JPEG disfarçados de PNG para PNG verdadeiro (icon, splash, favicon, android-foreground)
- [x] Adicionar plugins obrigatórios ao app.config.ts (expo-local-authentication, expo-notifications, datetimepicker)

## Fase 3 — Sincronização em Nuvem + Login Google
- [ ] Schema do banco de dados (tabelas financeiras completas)
- [ ] API tRPC: rotas de sincronização (upsert, fetch, delete)
- [ ] Tela de login com OAuth Google/Manus
- [ ] Integrar finance-context com backend (sync automático)
- [ ] Backup automático local (exportar JSON)

## Fase 4 — Redesign Visual Premium
- [ ] Migrar telas para NativeWind (remover StyleSheet manual)
- [ ] Glassmorphism nos cards (blur + transparência)
- [ ] Tab bar customizada com indicador animado
- [ ] Instalar e configurar react-native-gifted-charts
- [ ] Gráfico de linha para evolução mensal no Dashboard
- [ ] Gráfico de barras empilhadas por categoria
- [ ] Card visual estilo cartão bancário na tela de Crédito
- [ ] Animações com Reanimated 4 (substituir Animated.timing)
- [ ] Tipografia hierárquica melhorada

## Fase 5 — Novas Funcionalidades
- [ ] Orçamento mensal por categoria com alertas
- [ ] Tela de Histórico dedicada (aba nova)
- [ ] Importar extrato CSV (papaparse)
- [ ] Gráfico de evolução mensal na tela de Metas
- [ ] Recorrência inteligente (sugestão automática)
- [ ] Duplicar mês com personalização

## Fase 6 — Performance e Código
- [ ] useMemo nos cálculos do Dashboard e Transações
- [ ] useCallback nos handlers de eventos
- [ ] Refatorar index.tsx em componentes menores
- [ ] Refatorar transactions.tsx em componentes menores
- [ ] Testes unitários para cálculos financeiros críticos
