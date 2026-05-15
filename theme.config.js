/** @type {const} */
// ── FinanceFlow DoMore Theme v2 ─────────────────────────────────────────
// Paleta evoluída: mantém neon signature + light mode harmonioso
// Dark: neon #AAFF00 sobre fundos #0F0F12/#17171D
// Light: neon #7ACC00 (escurecido para contraste) sobre #FAFAF7
const themeColors = {
  // ── Brand ────────────────────────────────────────────────────────────
  primary:    { light: '#7ACC00', dark: '#AAFF00' },   // Neon adaptativo
  neonInk:    { light: '#FFFFFF', dark: '#0F0F12' },   // Texto dentro do neon

  // ── Neutrals ─────────────────────────────────────────────────────────
  background: { light: '#FAFAF7', dark: '#0F0F12' },
  surface:    { light: '#FFFFFF', dark: '#17171D' },
  surface2:   { light: '#F2F2EE', dark: '#1E1E26' },
  card:       { light: '#FFFFFF', dark: '#1A1A22' },
  card2:      { light: '#F5F5F0', dark: '#20202A' },
  foreground: { light: '#0F0F12', dark: '#F2F2FF' },
  text2:      { light: '#40404A', dark: '#C8C8E0' },
  muted:      { light: '#7A7A86', dark: '#7A7A96' },
  muted2:     { light: '#B8B8C0', dark: '#4A4A62' },
  border:     { light: '#E8E8E0', dark: '#252530' },
  border2:    { light: '#D8D8D0', dark: '#303040' },

  // ── Semantic ─────────────────────────────────────────────────────────
  success:    { light: '#00A872', dark: '#00E5A0' },
  warning:    { light: '#D97706', dark: '#FFBB45' },
  error:      { light: '#E04040', dark: '#FF6060' },

  // ── Finance-specific ─────────────────────────────────────────────────
  income:     { light: '#00A872', dark: '#00E5A0' },
  expense:    { light: '#E04040', dark: '#FF6060' },
  savings:    { light: '#8B5CF6', dark: '#C084FC' },
  credit:     { light: '#D97706', dark: '#FFBB45' },
};

module.exports = { themeColors };
