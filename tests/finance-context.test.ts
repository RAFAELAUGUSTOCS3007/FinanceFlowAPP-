import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, CATEGORIES, PAYMENT_METHODS, MONTH_NAMES } from "../lib/finance-context";

describe("formatCurrency", () => {
  it("formats positive values correctly", () => {
    const result = formatCurrency(1500);
    expect(result).toContain("1.500");
    expect(result).toContain("R$");
  });

  it("formats decimal values correctly", () => {
    const result = formatCurrency(25.50);
    expect(result).toContain("25,50");
  });

  it("formats zero correctly", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0");
  });
});

describe("formatDate", () => {
  it("formats ISO date to DD/MM/YYYY", () => {
    expect(formatDate("2026-03-15")).toBe("15/03/2026");
  });

  it("formats single digit day and month", () => {
    expect(formatDate("2026-01-05")).toBe("05/01/2026");
  });
});

describe("CATEGORIES", () => {
  it("contains expected categories", () => {
    expect(CATEGORIES).toContain("🍗 Alimentação");
    expect(CATEGORIES).toContain("🔋 Saúde e Bem-estar");
    expect(CATEGORIES).toContain("💪 Academia");
    expect(CATEGORIES).toContain("Outros");
  });

  it("has 12 categories", () => {
    expect(CATEGORIES).toHaveLength(12);
  });
});

describe("PAYMENT_METHODS", () => {
  it("contains expected payment methods", () => {
    expect(PAYMENT_METHODS).toContain("Pix / Dinheiro");
    expect(PAYMENT_METHODS).toContain("Débito");
    expect(PAYMENT_METHODS).toContain("Crédito");
  });
});

describe("MONTH_NAMES", () => {
  it("has 12 months", () => {
    expect(MONTH_NAMES).toHaveLength(12);
  });

  it("starts with Janeiro", () => {
    expect(MONTH_NAMES[0]).toBe("Janeiro");
  });

  it("ends with Dezembro", () => {
    expect(MONTH_NAMES[11]).toBe("Dezembro");
  });

  it("contains Março at index 2", () => {
    expect(MONTH_NAMES[2]).toBe("Março");
  });
});
