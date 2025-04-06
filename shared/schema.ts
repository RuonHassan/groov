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
  scheduled: z.boolean(),
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

// Pomodoro sessions
export const pomodoroSessions = pgTable("pomodoro_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Link to user
  taskId: integer("task_id"), // Optional link to a task
  duration: integer("duration").notNull().default(25), // Duration in minutes
  status: text("status").notNull().default("completed"), // in-progress, completed, abandoned
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPomodoroSessionSchema = createInsertSchema(pomodoroSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const pomodoroSessionSchema = z.object({
  id: z.number(),
  userId: z.number(),
  taskId: z.number().nullable(),
  duration: z.number(),
  status: z.string(),
  startTime: z.instanceof(Date),
  endTime: z.instanceof(Date).nullable(),
  createdAt: z.instanceof(Date),
  updatedAt: z.instanceof(Date),
});

export type InsertPomodoroSession = z.infer<typeof insertPomodoroSessionSchema>;
export type PomodoroSession = z.infer<typeof pomodoroSessionSchema>;

// Forest trees
export const forestTrees = pgTable("forest_trees", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Link to user
  pomodoroSessionId: integer("pomodoro_session_id").notNull(), // Link to the completed pomodoro session
  treeType: text("tree_type").notNull().default("oak"), // oak, pine, cherry, maple, etc.
  growthStage: integer("growth_stage").notNull().default(100), // 0-100% grown
  name: text("name"), // Optional name for the tree
  plantedAt: timestamp("planted_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertForestTreeSchema = createInsertSchema(forestTrees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const forestTreeSchema = z.object({
  id: z.number(),
  userId: z.number(),
  pomodoroSessionId: z.number(),
  treeType: z.string(),
  growthStage: z.number(),
  name: z.string().nullable(),
  plantedAt: z.instanceof(Date),
  createdAt: z.instanceof(Date),
  updatedAt: z.instanceof(Date),
});

export type InsertForestTree = z.infer<typeof insertForestTreeSchema>;
export type ForestTree = z.infer<typeof forestTreeSchema>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  totalPomodoros: integer("total_pomodoros").default(0), // Total completed pomodoros
  totalTrees: integer("total_trees").default(0), // Total trees grown
  streakDays: integer("streak_days").default(0), // Current streak of days with completed pomodoros
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  totalPomodoros: z.number(),
  totalTrees: z.number(),
  streakDays: z.number(),
  createdAt: z.instanceof(Date),
  updatedAt: z.instanceof(Date),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof userSchema>;
