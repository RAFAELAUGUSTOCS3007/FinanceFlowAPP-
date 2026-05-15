import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  getMonthData,
  upsertIncome,
  deleteIncome,
  upsertVariableExpense,
  deleteVariableExpense,
  upsertFixedExpense,
  deleteFixedExpense,
  upsertReservation,
  deleteReservation,
  upsertCategoryBudget,
  deleteCategoryBudget,
  upsertUserSettings,
  getUserSettings,
} from "./db";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────
const incomeSchema = z.object({
  id: z.string(),
  month: z.number(),
  year: z.number(),
  name: z.string(),
  value: z.string(),
});

const variableExpenseSchema = z.object({
  id: z.string(),
  month: z.number(),
  year: z.number(),
  name: z.string(),
  category: z.string(),
  value: z.string(),
  paymentMethod: z.enum(["debit", "credit", "pix", "cash"]),
  isEssential: z.boolean().optional(),
  date: z.string(),
  notes: z.string().optional().nullable(),
});

const fixedExpenseSchema = z.object({
  id: z.string(),
  month: z.number(),
  year: z.number(),
  name: z.string(),
  plannedValue: z.string(),
  actualValue: z.string().optional().nullable(),
  isPaid: z.boolean().optional(),
  paidDate: z.string().optional().nullable(),
  isRecurring: z.boolean().optional(),
});

const reservationSchema = z.object({
  id: z.string(),
  month: z.number(),
  year: z.number(),
  type: z.enum(["emergency", "personal"]),
  amount: z.string(),
  note: z.string().optional().nullable(),
});

const categoryBudgetSchema = z.object({
  month: z.number(),
  year: z.number(),
  category: z.string(),
  budgetLimit: z.string(),
});

const userSettingsSchema = z.object({
  displayName: z.string().optional().nullable(),
  pronouns: z.string().optional().nullable(),
  emergencyGoal: z.string().optional().nullable(),
  personalGoalName: z.string().optional().nullable(),
  personalGoalTarget: z.string().optional().nullable(),
  creditLimit: z.string().optional().nullable(),
  biometricEnabled: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
});

// ─── Finance Router ───────────────────────────────────────────────────────────
export const financeRouter = router({
  // Get all data for a month
  getMonthData: protectedProcedure
    .input(z.object({ month: z.number(), year: z.number() }))
    .query(({ ctx, input }) => getMonthData(ctx.user.id, input.month, input.year)),

  // User settings
  getSettings: protectedProcedure
    .query(({ ctx }) => getUserSettings(ctx.user.id)),

  updateSettings: protectedProcedure
    .input(userSettingsSchema)
    .mutation(({ ctx, input }) => upsertUserSettings(ctx.user.id, input)),

  // Income
  upsertIncome: protectedProcedure
    .input(incomeSchema)
    .mutation(({ ctx, input }) => upsertIncome(ctx.user.id, { ...input, userId: ctx.user.id })),

  deleteIncome: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => deleteIncome(ctx.user.id, input.id)),

  // Variable expenses
  upsertVariableExpense: protectedProcedure
    .input(variableExpenseSchema)
    .mutation(({ ctx, input }) => upsertVariableExpense(ctx.user.id, { ...input, userId: ctx.user.id })),

  deleteVariableExpense: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => deleteVariableExpense(ctx.user.id, input.id)),

  // Fixed expenses
  upsertFixedExpense: protectedProcedure
    .input(fixedExpenseSchema)
    .mutation(({ ctx, input }) => upsertFixedExpense(ctx.user.id, { ...input, userId: ctx.user.id })),

  deleteFixedExpense: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => deleteFixedExpense(ctx.user.id, input.id)),

  // Reservations
  upsertReservation: protectedProcedure
    .input(reservationSchema)
    .mutation(({ ctx, input }) => upsertReservation(ctx.user.id, { ...input, userId: ctx.user.id })),

  deleteReservation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => deleteReservation(ctx.user.id, input.id)),

  // Category budgets
  upsertCategoryBudget: protectedProcedure
    .input(categoryBudgetSchema)
    .mutation(({ ctx, input }) => upsertCategoryBudget(ctx.user.id, { ...input, userId: ctx.user.id })),

  deleteCategoryBudget: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteCategoryBudget(ctx.user.id, input.id)),
});
