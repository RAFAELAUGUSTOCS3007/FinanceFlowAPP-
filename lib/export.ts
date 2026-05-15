/**
 * lib/export.ts
 * Exportação nativa de dados — CSV e Excel
 *
 * Funciona 100% offline, sem depender do Google Drive.
 * CSV usa texto puro. Excel usa formato SYLK simplificado
 * compatível com iOS/Android e abre direto no Numbers/Excel.
 */

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import type { MonthData, VariableExpense, FixedExpense, Income } from "./store/finance-slice";
import { MONTH_NAMES } from "./finance-context";

export type ExportPeriod = "current" | "quarter" | "year" | "all";
export type ExportFormat = "csv" | "pdf";

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function escapeCSV(val: string | number | boolean): string {
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(cells: (string | number | boolean)[]): string {
  return cells.map(escapeCSV).join(",");
}

function formatBRL(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Filter months by period ──────────────────────────────────────────────────

export function filterMonths(
  months: MonthData[],
  period: ExportPeriod,
  currentMonth: number,
  currentYear: number
): MonthData[] {
  const sorted = [...months].sort(
    (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)
  );

  if (period === "all") return sorted;
  if (period === "current") {
    return sorted.filter((m) => m.month === currentMonth && m.year === currentYear);
  }
  if (period === "quarter") {
    const q = Math.floor((currentMonth - 1) / 3);
    return sorted.filter(
      (m) => m.year === currentYear && Math.floor((m.month - 1) / 3) === q
    );
  }
  if (period === "year") {
    return sorted.filter((m) => m.year === currentYear);
  }
  return sorted;
}

export function periodLabel(
  period: ExportPeriod,
  currentMonth: number,
  currentYear: number
): string {
  if (period === "current") return `${MONTH_NAMES[currentMonth - 1]}_${currentYear}`;
  if (period === "quarter") {
    const q = Math.floor((currentMonth - 1) / 3) + 1;
    return `T${q}_${currentYear}`;
  }
  if (period === "year") return String(currentYear);
  return "Completo";
}

// ─── Build CSV content ────────────────────────────────────────────────────────

function buildTransactionsCSV(months: MonthData[]): string {
  const lines: string[] = [
    csvRow(["Mês", "Ano", "Data", "Categoria", "Descrição", "Valor (R$)", "Essencial", "Forma de Pagamento"]),
  ];
  for (const m of months) {
    for (const e of m.variableExpenses) {
      lines.push(csvRow([
        MONTH_NAMES[m.month - 1],
        m.year,
        formatDate(e.date),
        e.category,
        e.description ?? "",
        formatBRL(e.value),
        e.isEssential ? "Sim" : "Não",
        e.paymentMethod,
      ]));
    }
  }
  return lines.join("\n");
}

function buildFixedCSV(months: MonthData[]): string {
  const lines: string[] = [
    csvRow(["Mês", "Ano", "Nome", "Valor Planejado (R$)", "Valor Real (R$)", "Status", "Data Pagamento"]),
  ];
  for (const m of months) {
    for (const f of m.fixedExpenses) {
      lines.push(csvRow([
        MONTH_NAMES[m.month - 1],
        m.year,
        f.name,
        formatBRL(f.plannedValue),
        f.actualValue != null ? formatBRL(f.actualValue) : "",
        f.isPaid ? "Pago" : "Pendente",
        f.paidDate ? formatDate(f.paidDate) : "",
      ]));
    }
  }
  return lines.join("\n");
}

function buildIncomeCSV(months: MonthData[]): string {
  const lines: string[] = [
    csvRow(["Mês", "Ano", "Fonte", "Valor (R$)"]),
  ];
  for (const m of months) {
    for (const i of m.incomes) {
      lines.push(csvRow([MONTH_NAMES[m.month - 1], m.year, i.name, formatBRL(i.value)]));
    }
  }
  return lines.join("\n");
}

function buildReservationsCSV(months: MonthData[]): string {
  const lines: string[] = [
    csvRow(["Mês", "Ano", "Tipo", "Valor (R$)"]),
  ];
  for (const m of months) {
    for (const r of m.reservations) {
      lines.push(csvRow([
        MONTH_NAMES[m.month - 1],
        m.year,
        r.type === "emergency" ? "Reserva de Emergência" : "Meta Pessoal",
        formatBRL(r.value),
      ]));
    }
  }
  return lines.join("\n");
}

function buildSummaryCSV(months: MonthData[]): string {
  const lines: string[] = [
    csvRow(["Mês", "Ano", "Entradas (R$)", "Despesas Variáveis (R$)", "Despesas Fixas (R$)", "Reservas (R$)", "Saldo (R$)"]),
  ];
  for (const m of months) {
    const income = m.incomes.reduce((s, i) => s + i.value, 0);
    const variable = m.variableExpenses.reduce((s, e) => s + e.value, 0);
    const fixed = m.fixedExpenses.filter((f) => f.isPaid).reduce((s, f) => s + (f.actualValue ?? f.plannedValue), 0);
    const reservations = m.reservations.reduce((s, r) => s + r.value, 0);
    const balance = income - variable - fixed - reservations;
    lines.push(csvRow([
      MONTH_NAMES[m.month - 1],
      m.year,
      formatBRL(income),
      formatBRL(variable),
      formatBRL(fixed),
      formatBRL(reservations),
      formatBRL(balance),
    ]));
  }
  return lines.join("\n");
}

// ─── Export to CSV ────────────────────────────────────────────────────────────

export async function exportToCSV(
  months: MonthData[],
  label: string
): Promise<void> {
  const sections = [
    "=== RESUMO MENSAL ===",
    buildSummaryCSV(months),
    "",
    "=== ENTRADAS ===",
    buildIncomeCSV(months),
    "",
    "=== DESPESAS VARIÁVEIS ===",
    buildTransactionsCSV(months),
    "",
    "=== DESPESAS FIXAS ===",
    buildFixedCSV(months),
    "",
    "=== RESERVAS ===",
    buildReservationsCSV(months),
  ];

  const content = "\uFEFF" + sections.join("\n"); // BOM for Excel UTF-8
  const filename = `FinanceFlow_${label}_${Date.now()}.csv`;
  const path = `${FileSystem.documentDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: "text/csv",
      dialogTitle: `Exportar ${label}`,
      UTI: "public.comma-separated-values-text",
    });
  }
}

// ─── Export to PDF (enhanced — reuses existing expo-print) ───────────────────

export function buildMonthlyReportHTML(
  months: MonthData[],
  label: string,
  userName: string,
  settings?: { emergencyFundTarget?: number; goalTarget?: number; goalName?: string }
): string {
  // ─── Totals ─────────────────────────────────────────────────────────────
  const totalIncome = months.reduce((s, m) => s + m.incomes.reduce((a, i) => a + i.value, 0), 0);
  const totalVariable = months.reduce((s, m) => s + m.variableExpenses.reduce((a, e) => a + e.value, 0), 0);
  const totalFixed = months.reduce((s, m) => s + m.fixedExpenses.filter((f) => f.isPaid).reduce((a, f) => a + (f.actualValue ?? f.plannedValue), 0), 0);
  const totalReservations = months.reduce((s, m) => s + m.reservations.reduce((a, r) => a + r.value, 0), 0);
  const totalExpenses = totalVariable + totalFixed;
  const netBalance = totalIncome - totalExpenses - totalReservations;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // ─── Score médio ────────────────────────────────────────────────────────
  const expenseRatio = totalIncome > 0 ? totalExpenses / totalIncome : 1;
  const score = Math.max(0, Math.min(100, Math.round(100 - expenseRatio * 80 + (totalReservations > 0 ? 15 : 0))));
  const scoreLabel = score >= 80 ? "EXCELENTE" : score >= 60 ? "BOM" : score >= 40 ? "ATENÇÃO" : "CRÍTICO";
  const scoreColor = score >= 80 ? "#AAFF00" : score >= 60 ? "#00E5A0" : score >= 40 ? "#FFBB45" : "#FF6060";

  // ─── Score ring dashoffset ──────────────────────────────────────────────
  const ringCircumference = 2 * Math.PI * 48;
  const ringFilled = (score / 100) * ringCircumference;
  const ringEmpty = ringCircumference - ringFilled;

  // ─── Categorias ─────────────────────────────────────────────────────────
  const categoryTotals: Record<string, number> = {};
  months.forEach((m) => m.variableExpenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] ?? 0) + e.value;
  }));
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const topCategoryName = topCategories[0]?.[0]?.replace(/^\p{Emoji}\s*/u, "") ?? "";
  const topCategoryPct = topCategories[0] && totalVariable > 0 ? (topCategories[0][1] / totalVariable) * 100 : 0;

  // ─── Emergência e metas ─────────────────────────────────────────────────
  const emergencyTotal = months.flatMap((m) => m.reservations).filter((r) => r.type === "emergency").reduce((s, r) => s + r.value, 0);
  const goalTotal = months.flatMap((m) => m.reservations).filter((r) => r.type === "goal").reduce((s, r) => s + r.value, 0);
  const emergencyTarget = settings?.emergencyFundTarget ?? 0;
  const goalTarget = settings?.goalTarget ?? 0;
  const goalName = settings?.goalName ?? "Minha Meta";
  const emergencyPct = emergencyTarget > 0 ? (emergencyTotal / emergencyTarget) * 100 : 0;
  const goalPct = goalTarget > 0 ? (goalTotal / goalTarget) * 100 : 0;

  // ─── Formatação ─────────────────────────────────────────────────────────
  const formatBRL = (v: number) => "R$ " + v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const formatBRLShort = (v: number) => {
    if (Math.abs(v) >= 1000) {
      return "R$ " + Math.round(v).toLocaleString("pt-BR");
    }
    return formatBRL(v);
  };

  // ─── Linhas da tabela mensal ───────────────────────────────────────────
  const monthRows = months.map((m, i) => {
    const inc = m.incomes.reduce((s, i2) => s + i2.value, 0);
    const vari = m.variableExpenses.reduce((s, e) => s + e.value, 0);
    const fix = m.fixedExpenses.filter((f) => f.isPaid).reduce((s, f) => s + (f.actualValue ?? f.plannedValue), 0);
    const res = m.reservations.reduce((s, r) => s + r.value, 0);
    const bal = inc - vari - fix;
    const isLast = i === months.length - 1;
    return `
      <tr${isLast ? ' style="background: rgba(170,255,0,0.03);"' : ''}>
        <td style="padding:11px 14px;font-weight:500;color:#C8C8E0;${isLast ? '' : 'border-bottom:1px solid #1A1A22;'}">${MONTH_NAMES[m.month - 1]} ${m.year}</td>
        <td style="padding:11px 14px;text-align:right;color:#00E5A0;font-family:ui-monospace,monospace;font-weight:500;${isLast ? '' : 'border-bottom:1px solid #1A1A22;'}">${formatBRL(inc)}</td>
        <td style="padding:11px 14px;text-align:right;color:#FF6060;font-family:ui-monospace,monospace;font-weight:500;${isLast ? '' : 'border-bottom:1px solid #1A1A22;'}">${formatBRL(vari + fix)}</td>
        <td style="padding:11px 14px;text-align:right;color:#C084FC;font-family:ui-monospace,monospace;font-weight:500;${isLast ? '' : 'border-bottom:1px solid #1A1A22;'}">${formatBRL(res)}</td>
        <td style="padding:11px 14px;text-align:right;font-family:ui-monospace,monospace;font-weight:900;color:${bal >= 0 ? '#AAFF00' : '#FF6060'};${isLast ? '' : 'border-bottom:1px solid #1A1A22;'}">${formatBRL(bal)}</td>
      </tr>`;
  }).join("");

  // ─── Linhas de categoria ────────────────────────────────────────────────
  const catRows = topCategories.map(([cat, val], i) => {
    const pct = totalVariable > 0 ? (val / totalVariable) * 100 : 0;
    const emoji = cat.match(/^\p{Emoji}/u)?.[0] ?? "📊";
    const name = cat.replace(/^\p{Emoji}\s*/u, "");
    const isLast = i === topCategories.length - 1;
    return `
      <div style="display:grid;grid-template-columns:150px 1fr 90px;gap:12px;align-items:center;padding:10px 0;${isLast ? '' : 'border-bottom:1px solid #252530;'}">
        <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:14px;">${emoji}</span><span style="color:#C8C8E0;font-size:12px;font-weight:500;">${name}</span></div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="flex:1;height:6px;background:#252530;border-radius:3px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#AAFF00,#00E5A0);"></div>
          </div>
          <span style="font-size:11px;font-weight:900;color:#AAFF00;font-family:ui-monospace,monospace;width:44px;text-align:right;">${pct.toFixed(1)}%</span>
        </div>
        <div style="text-align:right;color:#FF6060;font-family:ui-monospace,monospace;font-weight:500;font-size:12px;">${formatBRL(val)}</div>
      </div>`;
  }).join("");

  // ─── Data ────────────────────────────────────────────────────────────────
  const now = new Date();
  const day = now.getDate().toString().padStart(2, "0");
  const monthLong = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"][now.getMonth()];
  const year = now.getFullYear();
  const dateStr = `${day} · ${monthLong} · ${year}`;

  // ─── Título do período ──────────────────────────────────────────────────
  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];
  const mainTitle = firstMonth ? MONTH_NAMES[firstMonth.month - 1] : label;
  const subtitle = firstMonth && lastMonth && months.length > 1
    ? `— ${MONTH_NAMES[lastMonth.month - 1]} ${lastMonth.year}`
    : (firstMonth ? `${firstMonth.year}` : "");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { margin: 0; size: A4; }
  html, body { background: #0A0A0F; color: #F2F2FF; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 20mm 18mm;
    position: relative;
    overflow: hidden;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }

  /* ─── PÁGINA 1 — CAPA ────────────────────────────────────── */
  .cover-page { display: flex; flex-direction: column; }
  .glow-1 {
    position: absolute; top: -80px; right: -80px;
    width: 320px; height: 320px; border-radius: 50%;
    background: radial-gradient(circle, rgba(170,255,0,0.08) 0%, transparent 70%);
  }
  .glow-2 {
    position: absolute; bottom: -120px; left: -100px;
    width: 360px; height: 360px; border-radius: 50%;
    background: radial-gradient(circle, rgba(0,229,160,0.05) 0%, transparent 70%);
  }
  .brand-row {
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 48px; position: relative; z-index: 1;
  }
  .brand-icon {
    width: 56px; height: 56px; border-radius: 14px; background: #AAFF00;
    display: flex; align-items: center; justify-content: center;
  }
  .brand-icon svg { width: 32px; height: 32px; }
  .brand-name { font-size: 30px; font-weight: 900; letter-spacing: -1.5px; line-height: 1; }
  .brand-name span { color: #AAFF00; }
  .brand-tag {
    color: #7A7A96; font-size: 10px; letter-spacing: 2px;
    text-transform: uppercase; font-weight: 700; margin-top: 5px;
  }

  .cover-body {
    flex: 1;
    display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    text-align: center; position: relative; z-index: 1;
    margin: 20px 0 40px;
  }
  .cover-eyebrow {
    color: #7A7A96; font-size: 11px; font-weight: 700;
    letter-spacing: 3px; text-transform: uppercase; margin-bottom: 14px;
  }
  .cover-title {
    font-size: 60px; font-weight: 900; letter-spacing: -3px;
    line-height: 1; color: #F2F2FF; margin-bottom: 14px;
  }
  .cover-subtitle {
    font-size: 30px; font-weight: 700; letter-spacing: -1px;
    color: #AAFF00; margin-bottom: 8px;
  }
  .cover-period-badge {
    display: inline-block; padding: 8px 20px;
    background: rgba(170,255,0,0.12);
    border: 1px solid rgba(170,255,0,0.35);
    border-radius: 24px; color: #AAFF00;
    font-size: 11px; font-weight: 700;
    letter-spacing: 1.5px; text-transform: uppercase;
    margin-top: 22px;
  }

  .cover-highlights {
    margin-top: 70px;
    display: grid; grid-template-columns: 1fr 1px 1fr;
    gap: 28px; align-items: center;
    width: 100%; max-width: 480px;
  }
  .highlight-label {
    font-size: 10px; font-weight: 700; letter-spacing: 2px;
    color: #7A7A96; text-transform: uppercase; margin-bottom: 10px;
  }
  .highlight-value {
    font-size: 36px; font-weight: 900; letter-spacing: -1.8px;
    font-family: ui-monospace, "SF Mono", Monaco, monospace;
  }
  .highlight-sub { font-size: 10px; color: #7A7A96; margin-top: 4px; }
  .highlight-divider { width: 1px; height: 80px; background: #252530; }

  .cover-footer {
    border-top: 1px solid #252530; padding-top: 24px;
    position: relative; z-index: 1;
  }
  .cover-meta-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 32px;
    margin-bottom: 24px;
  }
  .cover-meta-label {
    font-size: 9px; font-weight: 700; letter-spacing: 2px;
    color: #7A7A96; text-transform: uppercase; margin-bottom: 6px;
  }
  .cover-meta-value { font-size: 15px; font-weight: 700; color: #F2F2FF; }

  .cover-bottom-bar {
    display: flex; justify-content: space-between; align-items: center;
    padding-top: 16px; border-top: 1px solid #1A1A22;
    font-size: 10px; color: #4A4A62; letter-spacing: 0.5px;
  }
  .cover-bottom-dot { width: 6px; height: 6px; background: #AAFF00; border-radius: 50%; display: inline-block; margin-right: 8px; vertical-align: middle; }

  /* ─── PÁGINA 2 — DADOS ─────────────────────────────────── */
  .data-page { padding-top: 18mm; }
  .page-header {
    display: flex; justify-content: space-between;
    align-items: center; border-bottom: 1px solid #252530;
    padding-bottom: 14px; margin-bottom: 22px;
  }
  .page-header-brand {
    display: flex; align-items: center; gap: 10px;
    font-size: 14px; font-weight: 900; letter-spacing: -0.8px;
  }
  .page-header-brand span { color: #AAFF00; }
  .page-header-tag {
    font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
    color: #7A7A96; text-transform: uppercase;
  }

  .kpis {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 10px; margin-bottom: 22px;
  }
  .kpi {
    background: #17171D; border: 1px solid #252530;
    border-radius: 12px; padding: 14px;
    position: relative; overflow: hidden;
  }
  .kpi-strip {
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
  }
  .kpi-label {
    font-size: 9px; font-weight: 700; letter-spacing: 1.2px;
    color: #7A7A96; text-transform: uppercase; margin-bottom: 6px;
  }
  .kpi-value {
    font-size: 18px; font-weight: 900; letter-spacing: -0.8px;
    font-family: ui-monospace, "SF Mono", Monaco, monospace;
  }
  .kpi-sub { font-size: 9px; color: #7A7A96; margin-top: 4px; }

  .section { margin-bottom: 20px; }
  .section-header {
    display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
  }
  .section-marker {
    width: 3px; height: 16px; background: #AAFF00; border-radius: 2px;
  }
  .section-title {
    font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
    color: #C8C8E0; text-transform: uppercase;
  }
  .data-card {
    background: #17171D; border: 1px solid #252530;
    border-radius: 12px; overflow: hidden;
  }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th {
    text-align: left; padding: 10px 14px; font-size: 9px;
    font-weight: 700; letter-spacing: 1px; color: #7A7A96;
    text-transform: uppercase; background: #1E1E26;
    border-bottom: 1px solid #252530;
  }
  td { color: #C8C8E0; }

  .goal-item { margin-bottom: 14px; }
  .goal-item:last-child { margin-bottom: 0; }
  .goal-top {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px;
  }
  .goal-left { display: flex; align-items: center; gap: 10px; }
  .goal-emoji { font-size: 18px; }
  .goal-name { color: #F2F2FF; font-size: 13px; font-weight: 700; }
  .goal-target { color: #7A7A96; font-size: 10px; }
  .goal-value { font-family: ui-monospace, monospace; font-weight: 900; font-size: 14px; }
  .goal-pct { color: #7A7A96; font-size: 10px; }
  .goal-bar-bg {
    height: 6px; background: #252530; border-radius: 3px; overflow: hidden;
  }

  .insight-card {
    padding: 12px 14px; border-radius: 4px; margin-bottom: 10px;
  }
  .insight-card.positive {
    background: rgba(170,255,0,0.04); border-left: 3px solid #AAFF00;
  }
  .insight-card.warning {
    background: rgba(255,187,69,0.04); border-left: 3px solid #FFBB45;
  }
  .insight-title {
    font-size: 10px; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; margin-bottom: 6px;
  }
  .insight-title.positive { color: #AAFF00; }
  .insight-title.warning { color: #FFBB45; }
  .insight-text {
    color: #C8C8E0; font-size: 11px; line-height: 1.7;
  }

  .page-footer {
    position: absolute; bottom: 12mm; left: 18mm; right: 18mm;
    padding-top: 12px; border-top: 1px solid #252530;
    display: flex; justify-content: space-between;
    font-size: 9px; color: #4A4A62; letter-spacing: 0.5px;
  }
</style>
</head>
<body>

<!-- ═══════════════════ PÁGINA 1 — CAPA ═══════════════════ -->
<div class="page cover-page">
  <div class="glow-1"></div>
  <div class="glow-2"></div>

  <div class="brand-row">
    <div class="brand-icon">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M3 20h3V10H3v10zm5 0h3V5H8v15zm5 0h3V14h-3v6zm5 0h3v-8h-3v8z" fill="#0A0A0F"/>
        <path d="M15 4l5 5-3 0 0 4-2 0 0-4-3 0z" fill="#0A0A0F"/>
      </svg>
    </div>
    <div>
      <div class="brand-name">Finance<span>Flow</span></div>
      <div class="brand-tag">Controle Financeiro Inteligente</div>
    </div>
  </div>

  <div class="cover-body">
    <div class="cover-eyebrow">Relatório Financeiro</div>
    <div class="cover-title">${mainTitle}</div>
    <div class="cover-subtitle">${subtitle}</div>
    <div class="cover-period-badge">${months.length} ${months.length === 1 ? "mês analisado" : "meses analisados"} · ${label}</div>

    <div class="cover-highlights">
      <div style="text-align: center;">
        <div class="highlight-label">Saldo Líquido</div>
        <div class="highlight-value" style="color: ${netBalance >= 0 ? '#AAFF00' : '#FF6060'};">${formatBRLShort(netBalance)}</div>
        <div class="highlight-sub">${savingsRate.toFixed(1)}% de economia</div>
      </div>
      <div class="highlight-divider"></div>
      <div style="text-align: center;">
        <div class="highlight-label">Score Médio</div>
        <div class="highlight-value" style="color: ${scoreColor};">${score}<span style="font-size: 16px; color: #7A7A96;">/100</span></div>
        <div class="highlight-sub" style="color: ${scoreColor}; font-weight: 700; letter-spacing: 1px;">${scoreLabel}</div>
      </div>
    </div>
  </div>

  <div class="cover-footer">
    <div class="cover-meta-grid">
      <div>
        <div class="cover-meta-label">Preparado para</div>
        <div class="cover-meta-value">${userName}</div>
      </div>
      <div style="text-align: right;">
        <div class="cover-meta-label">Emitido em</div>
        <div class="cover-meta-value">${dateStr}</div>
      </div>
    </div>
    <div class="cover-bottom-bar">
      <div><span class="cover-bottom-dot"></span>Documento confidencial</div>
      <span>Página 1 de 2</span>
    </div>
  </div>
</div>

<!-- ═══════════════════ PÁGINA 2 — DADOS ═══════════════════ -->
<div class="page data-page">

  <div class="page-header">
    <div class="page-header-brand">Finance<span>Flow</span></div>
    <div class="page-header-tag">Dados do Período · ${label}</div>
  </div>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-strip" style="background: #00E5A0;"></div>
      <div class="kpi-label">💰 Entradas</div>
      <div class="kpi-value" style="color: #00E5A0;">${formatBRL(totalIncome)}</div>
      <div class="kpi-sub">Total recebido</div>
    </div>
    <div class="kpi">
      <div class="kpi-strip" style="background: #FF6060;"></div>
      <div class="kpi-label">💸 Despesas</div>
      <div class="kpi-value" style="color: #FF6060;">${formatBRL(totalExpenses)}</div>
      <div class="kpi-sub">Var. + Fixas</div>
    </div>
    <div class="kpi">
      <div class="kpi-strip" style="background: #C084FC;"></div>
      <div class="kpi-label">🎯 Reservas</div>
      <div class="kpi-value" style="color: #C084FC;">${formatBRL(totalReservations)}</div>
      <div class="kpi-sub">Guardado</div>
    </div>
    <div class="kpi">
      <div class="kpi-strip" style="background: #AAFF00;"></div>
      <div class="kpi-label">⚡ Saldo Líquido</div>
      <div class="kpi-value" style="color: ${netBalance >= 0 ? '#AAFF00' : '#FF6060'};">${formatBRL(netBalance)}</div>
      <div class="kpi-sub">${savingsRate.toFixed(1)}% de poupança</div>
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-marker"></div>
      <div class="section-title">Resumo por Mês</div>
    </div>
    <div class="data-card">
      <table>
        <tr>
          <th>Mês</th>
          <th style="text-align: right;">Entradas</th>
          <th style="text-align: right;">Despesas</th>
          <th style="text-align: right;">Poupança</th>
          <th style="text-align: right;">Saldo</th>
        </tr>
        ${monthRows}
      </table>
    </div>
  </div>

  ${topCategories.length > 0 ? `
  <div class="section">
    <div class="section-header">
      <div class="section-marker"></div>
      <div class="section-title">Categorias de Gasto</div>
    </div>
    <div class="data-card" style="padding: 6px 16px;">
      ${catRows}
    </div>
  </div>
  ` : ""}

  ${(emergencyTarget > 0 || goalTarget > 0) ? `
  <div class="section">
    <div class="section-header">
      <div class="section-marker"></div>
      <div class="section-title">Metas & Reservas</div>
    </div>
    <div class="data-card" style="padding: 16px;">
      ${emergencyTarget > 0 ? `
      <div class="goal-item">
        <div class="goal-top">
          <div class="goal-left">
            <span class="goal-emoji">🛡️</span>
            <div>
              <div class="goal-name">Reserva de Emergência</div>
              <div class="goal-target">Meta: ${formatBRL(emergencyTarget)}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="goal-value" style="color: #C084FC;">${formatBRL(emergencyTotal)}</div>
            <div class="goal-pct">${emergencyPct.toFixed(1)}% concluído</div>
          </div>
        </div>
        <div class="goal-bar-bg"><div style="width: ${Math.min(100, emergencyPct)}%; height: 100%; background: #C084FC;"></div></div>
      </div>
      ` : ""}
      ${goalTarget > 0 ? `
      <div class="goal-item">
        <div class="goal-top">
          <div class="goal-left">
            <span class="goal-emoji">🎯</span>
            <div>
              <div class="goal-name">${goalName}</div>
              <div class="goal-target">Meta: ${formatBRL(goalTarget)}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="goal-value" style="color: #FFBB45;">${formatBRL(goalTotal)}</div>
            <div class="goal-pct">${goalPct.toFixed(1)}% concluído</div>
          </div>
        </div>
        <div class="goal-bar-bg"><div style="width: ${Math.min(100, goalPct)}%; height: 100%; background: #FFBB45;"></div></div>
      </div>
      ` : ""}
    </div>
  </div>
  ` : ""}

  <div class="section">
    <div class="insight-card ${netBalance >= 0 ? 'positive' : 'warning'}">
      <div class="insight-title ${netBalance >= 0 ? 'positive' : 'warning'}">💡 Análise do Período</div>
      <div class="insight-text">
        ${netBalance >= 0
          ? `Excelente controle financeiro. Você economizou <strong style="color: #AAFF00;">${formatBRL(netBalance)}</strong> no período, com taxa de poupança de <strong style="color: #AAFF00;">${savingsRate.toFixed(1)}%</strong>. Continue mantendo a disciplina e acelere suas metas de longo prazo.`
          : `Atenção: seus gastos excederam sua renda em <strong style="color: #FF6060;">${formatBRL(Math.abs(netBalance))}</strong>. Revise despesas variáveis e reavalie o orçamento do próximo mês.`
        }
      </div>
    </div>
    ${topCategoryName && topCategoryPct > 25 ? `
    <div class="insight-card warning">
      <div class="insight-title warning">⚠️ Atenção</div>
      <div class="insight-text">
        <strong style="color: #FFBB45;">${topCategoryName}</strong> representa <strong>${topCategoryPct.toFixed(1)}%</strong> dos seus gastos variáveis, a categoria mais expressiva do período. Vale avaliar oportunidades de otimização sem perder qualidade de vida.
      </div>
    </div>
    ` : ""}
  </div>

  <div class="page-footer">
    <span>FinanceFlow · Controle Financeiro Inteligente</span>
    <span>Página 2 de 2 · Confidencial</span>
  </div>

</div>

</body>
</html>`;
}

export async function exportToPDF(
  months: MonthData[],
  label: string,
  userName: string,
  settings?: { emergencyFundTarget?: number; goalTarget?: number; goalName?: string }
): Promise<void> {
  const html = buildMonthlyReportHTML(months, label, userName, settings);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // Rename to meaningful filename
  const filename = `${FileSystem.documentDirectory}FinanceFlow_${label}_${Date.now()}.pdf`;
  await FileSystem.moveAsync({ from: uri, to: filename });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filename, {
      mimeType: "application/pdf",
      dialogTitle: `Relatório ${label}`,
      UTI: "com.adobe.pdf",
    });
  }
}

// ─── Stats for preview ────────────────────────────────────────────────────────

export function getExportStats(months: MonthData[]) {
  const transactionCount = months.reduce((s, m) => s + m.variableExpenses.length, 0);
  const fixedCount = months.reduce((s, m) => s + m.fixedExpenses.length, 0);
  const incomeCount = months.reduce((s, m) => s + m.incomes.length, 0);
  const monthCount = months.length;
  return { transactionCount, fixedCount, incomeCount, monthCount };
}
