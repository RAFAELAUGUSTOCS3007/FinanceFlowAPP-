import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── User Settings ────────────────────────────────────────────────────────────
export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  displayName: varchar("displayName", { length: 100 }),
  pronouns: varchar("pronouns", { length: 30 }),
  emergencyGoal: decimal("emergencyGoal", { precision: 12, scale: 2 }).default("0"),
  personalGoalName: varchar("personalGoalName", { length: 100 }),
  personalGoalTarget: decimal("personalGoalTarget", { precision: 12, scale: 2 }).default("0"),
  creditLimit: decimal("creditLimit", { precision: 12, scale: 2 }).default("0"),
  biometricEnabled: boolean("biometricEnabled").default(false),
  notificationsEnabled: boolean("notificationsEnabled").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Income (Entradas) ────────────────────────────────────────────────────────
export const incomes = mysqlTable("incomes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Variable Expenses (Despesas Variáveis) ───────────────────────────────────
export const variableExpenses = mysqlTable("variable_expenses", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["debit", "credit", "pix", "cash"]).notNull(),
  isEssential: boolean("isEssential").default(false),
  date: varchar("date", { length: 10 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Fixed Expenses (Despesas Fixas) ─────────────────────────────────────────
export const fixedExpenses = mysqlTable("fixed_expenses", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  plannedValue: decimal("plannedValue", { precision: 12, scale: 2 }).notNull(),
  actualValue: decimal("actualValue", { precision: 12, scale: 2 }),
  isPaid: boolean("isPaid").default(false),
  paidDate: varchar("paidDate", { length: 10 }),
  isRecurring: boolean("isRecurring").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Reservations / Goals (Metas e Reservas) ─────────────────────────────────
export const reservations = mysqlTable("reservations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  type: mysqlEnum("type", ["emergency", "personal"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Category Budgets (Orçamento por Categoria) ───────────────────────────────
export const categoryBudgets = mysqlTable("category_budgets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  budgetLimit: decimal("budgetLimit", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Additional Types ─────────────────────────────────────────────────────────
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
export type Income = typeof incomes.$inferSelect;
export type InsertIncome = typeof incomes.$inferInsert;
export type VariableExpense = typeof variableExpenses.$inferSelect;
export type InsertVariableExpense = typeof variableExpenses.$inferInsert;
export type FixedExpense = typeof fixedExpenses.$inferSelect;
export type InsertFixedExpense = typeof fixedExpenses.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;
export type CategoryBudget = typeof categoryBudgets.$inferSelect;
export type InsertCategoryBudget = typeof categoryBudgets.$inferInsert;
