import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// This schema defines the Task entity with GTD methodology properties
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("inbox"), // inbox, next, waiting, project, someday, done
  context: text("context").notNull().default("work"), // work, home, errands, calls, etc.
  priority: text("priority").notNull().default("medium"), // high, medium, low
  dueDate: date("due_date"),
  time: integer("time"), // estimated time in minutes
  energy: text("energy").notNull().default("medium"), // high, medium, low
  delegatedTo: text("delegated_to"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  scheduled: boolean("scheduled").default(false), // Whether the task is scheduled on the calendar
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Add custom transformations for date handling in the schema
export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  notes: z.string().nullable(),
  status: z.string(),
  context: z.string(),
  priority: z.string(),
  dueDate: z.string().nullable().or(z.instanceof(Date).nullable()),
  time: z.number().nullable(),
  energy: z.string(),
  delegatedTo: z.string().nullable(),
  createdAt: z.instanceof(Date),
  updatedAt: z.instanceof(Date),
  scheduled: z.boolean().default(false),
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = z.infer<typeof taskSchema>;

// Calendar events for time blocking
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id"), // Optional relation to a task (can be null for non-task events)
  title: text("title").notNull(),
  start: timestamp("start").notNull(),
  end: timestamp("end").notNull(),
  allDay: boolean("all_day").default(false),
  notes: text("notes"),
  color: text("color").default("#3b82f6"), // Default color for events
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Custom schema with string date handling for calendar events
export const insertCalendarEventSchema = z.object({
  taskId: z.number().nullable(),
  title: z.string(),
  start: z.string().or(z.instanceof(Date)),
  end: z.string().or(z.instanceof(Date)),
  allDay: z.boolean().default(false),
  notes: z.string().nullable(),
  color: z.string().default("#3b82f6"),
});

// Add custom transformations for date handling in the schema
export const calendarEventSchema = z.object({
  id: z.number(),
  taskId: z.number().nullable(),
  title: z.string(),
  start: z.instanceof(Date),
  end: z.instanceof(Date),
  allDay: z.boolean().default(false),
  notes: z.string().nullable(),
  color: z.string().default("#3b82f6"),
  createdAt: z.instanceof(Date),
  updatedAt: z.instanceof(Date),
});

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
