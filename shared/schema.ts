import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Simplified tasks table schema using camelCase JS keys
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes"), // Description
  color: text("color"), // -> color (can add default in DB or frontend)
  startTime: timestamp("start_time"), // JS: startTime -> SQL: start_time
  endTime: timestamp("end_time"),     // JS: endTime -> SQL: end_time
  createdAt: timestamp("created_at").notNull().defaultNow(), // JS: createdAt -> SQL: created_at
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // JS: updatedAt -> SQL: updated_at
  // userId: integer("user_id"), // Keep if using user ID
});

// Simplified insert schema
export const insertTaskSchema = createInsertSchema(tasks, {
  // Add Zod refinements/defaults if needed
  title: z.string().min(1), // Title is required
  notes: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex").nullable().optional(),
  startTime: z.string().datetime({ offset: true }).nullable().optional(),
  endTime: z.string().datetime({ offset: true }).nullable().optional(),
}).omit({
  id: true,
  createdAt: true, 
  updatedAt: true,
});

// Simplified Zod schema for Task (fetched data) - USE snake_case
export const taskSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  notes: z.string().nullable(),
  color: z.string().nullable(),
  start_time: z.string().datetime({ offset: true }).nullable(), // snake_case
  end_time: z.string().datetime({ offset: true }).nullable(),   // snake_case
  created_at: z.string().datetime({ offset: true }), // snake_case
  updated_at: z.string().datetime({ offset: true }), // snake_case
  // user_id: z.number().int().optional(), // snake_case if present
});

// Simplified types
export type InsertTask = z.infer<typeof insertTaskSchema>; // Stays camelCase from pgTable def
export type Task = z.infer<typeof taskSchema>; // Now reflects snake_case DB structure

// Remove other schemas if they are no longer relevant
// Or keep them if pomodoro/forest/users are still used
// ... (Pomodoro, Forest, User schemas) ...

export const pomodoroSessionSchema = z.object({
  // ... other fields ...
  start_time: z.string().datetime({ offset: true }), // snake_case
  end_time: z.string().datetime({ offset: true }).nullable(), // snake_case
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const forestTreeSchema = z.object({
  // ... other fields ...
  tree_type: z.string(), // snake_case
  growth_stage: z.number(), // snake_case
  planted_at: z.string().datetime({ offset: true }), // snake_case
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const userSchema = z.object({
  // ... other fields ...
  total_pomodoros: z.number(), // snake_case
  total_trees: z.number(), // snake_case
  streak_days: z.number(), // snake_case
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});
