import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  categoryBudgets,
  fixedExpenses,
  incomes,
  reservations,
  userSettings,
  variableExpenses,
  users,
  type InsertCategoryBudget,
  type InsertFixedExpense,
  type InsertIncome,
  type InsertReservation,
  type InsertUserSettings,
  type InsertVariableExpense,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── User Settings ────────────────────────────────────────────────────────────
export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  return rows[0] ?? null;
}

export async function upsertUserSettings(userId: number, data: Partial<InsertUserSettings>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getUserSettings(userId);
  if (existing) {
    await db.update(userSettings).set({ ...data, updatedAt: new Date() }).where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values({ userId, ...data });
  }
  return getUserSettings(userId);
}

// ─── Income ────────────────────────────────────────────────────────────────────────
export async function getIncomes(userId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(incomes).where(
    and(eq(incomes.userId, userId), eq(incomes.month, month), eq(incomes.year, year))
  );
}

export async function upsertIncome(userId: number, data: InsertIncome) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(incomes).where(eq(incomes.id, data.id));
  if (existing.length > 0) {
    await db.update(incomes).set({ ...data, updatedAt: new Date() }).where(eq(incomes.id, data.id));
  } else {
    await db.insert(incomes).values({ ...data, userId });
  }
}

export async function deleteIncome(userId: number, id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(incomes).where(and(eq(incomes.id, id), eq(incomes.userId, userId)));
}

// ─── Variable Expenses ──────────────────────────────────────────────────────────
export async function getVariableExpenses(userId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(variableExpenses).where(
    and(eq(variableExpenses.userId, userId), eq(variableExpenses.month, month), eq(variableExpenses.year, year))
  );
}

export async function upsertVariableExpense(userId: number, data: InsertVariableExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(variableExpenses).where(eq(variableExpenses.id, data.id));
  if (existing.length > 0) {
    await db.update(variableExpenses).set({ ...data, updatedAt: new Date() }).where(eq(variableExpenses.id, data.id));
  } else {
    await db.insert(variableExpenses).values({ ...data, userId });
  }
}

export async function deleteVariableExpense(userId: number, id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(variableExpenses).where(and(eq(variableExpenses.id, id), eq(variableExpenses.userId, userId)));
}

// ─── Fixed Expenses ─────────────────────────────────────────────────────────────────
export async function getFixedExpenses(userId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fixedExpenses).where(
    and(eq(fixedExpenses.userId, userId), eq(fixedExpenses.month, month), eq(fixedExpenses.year, year))
  );
}

export async function upsertFixedExpense(userId: number, data: InsertFixedExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(fixedExpenses).where(eq(fixedExpenses.id, data.id));
  if (existing.length > 0) {
    await db.update(fixedExpenses).set({ ...data, updatedAt: new Date() }).where(eq(fixedExpenses.id, data.id));
  } else {
    await db.insert(fixedExpenses).values({ ...data, userId });
  }
}

export async function deleteFixedExpense(userId: number, id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(fixedExpenses).where(and(eq(fixedExpenses.id, id), eq(fixedExpenses.userId, userId)));
}

// ─── Reservations ──────────────────────────────────────────────────────────────────
export async function getReservations(userId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reservations).where(
    and(eq(reservations.userId, userId), eq(reservations.month, month), eq(reservations.year, year))
  );
}

export async function upsertReservation(userId: number, data: InsertReservation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(reservations).where(eq(reservations.id, data.id));
  if (existing.length > 0) {
    await db.update(reservations).set({ ...data, updatedAt: new Date() }).where(eq(reservations.id, data.id));
  } else {
    await db.insert(reservations).values({ ...data, userId });
  }
}

export async function deleteReservation(userId: number, id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reservations).where(and(eq(reservations.id, id), eq(reservations.userId, userId)));
}

// ─── Category Budgets ────────────────────────────────────────────────────────────
export async function getCategoryBudgets(userId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categoryBudgets).where(
    and(eq(categoryBudgets.userId, userId), eq(categoryBudgets.month, month), eq(categoryBudgets.year, year))
  );
}

export async function upsertCategoryBudget(userId: number, data: InsertCategoryBudget) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(categoryBudgets).where(
    and(eq(categoryBudgets.userId, userId), eq(categoryBudgets.month, data.month), eq(categoryBudgets.year, data.year), eq(categoryBudgets.category, data.category))
  );
  if (existing.length > 0) {
    await db.update(categoryBudgets).set({ budgetLimit: data.budgetLimit, updatedAt: new Date() }).where(eq(categoryBudgets.id, existing[0].id));
  } else {
    await db.insert(categoryBudgets).values({ ...data, userId });
  }
}

export async function deleteCategoryBudget(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(categoryBudgets).where(and(eq(categoryBudgets.id, id), eq(categoryBudgets.userId, userId)));
}

// ─── Full Month Sync ──────────────────────────────────────────────────────────────
export async function getMonthData(userId: number, month: number, year: number) {
  const [incomeList, variableList, fixedList, reservationList, budgetList, settings] = await Promise.all([
    getIncomes(userId, month, year),
    getVariableExpenses(userId, month, year),
    getFixedExpenses(userId, month, year),
    getReservations(userId, month, year),
    getCategoryBudgets(userId, month, year),
    getUserSettings(userId),
  ]);
  return { incomes: incomeList, variableExpenses: variableList, fixedExpenses: fixedList, reservations: reservationList, categoryBudgets: budgetList, settings };
}
