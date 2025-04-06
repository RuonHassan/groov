import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertTaskSchema, 
  insertCalendarEventSchema, 
  insertPomodoroSessionSchema, 
  insertForestTreeSchema,
  type InsertCalendarEvent,
  type InsertPomodoroSession,
  type InsertForestTree 
} from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // prefix all routes with /api
  
  // Task Routes
  // ===========
  
  // Get all tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving tasks" });
    }
  });

  // Get task by id
  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving task" });
    }
  });

  // Create a new task
  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const newTask = await storage.createTask(validatedData);
      res.status(201).json(newTask);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid task data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating task" });
    }
  });

  // Update a task
  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      // Partial validation of the update data
      const validatedData = insertTaskSchema.partial().parse(req.body);
      const updatedTask = await storage.updateTask(id, validatedData);
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(updatedTask);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid task data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error updating task" });
    }
  });

  // Delete a task
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const deleted = await storage.deleteTask(id);
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting task" });
    }
  });

  // Calendar Event Routes
  // =====================
  
  // Get all calendar events
  app.get("/api/calendar-events", async (req, res) => {
    try {
      const events = await storage.getCalendarEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving calendar events" });
    }
  });

  // Get calendar event by id
  app.get("/api/calendar-events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const event = await storage.getCalendarEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Calendar event not found" });
      }

      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving calendar event" });
    }
  });
  
  // Get calendar events for a specific task
  app.get("/api/tasks/:taskId/calendar-events", async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      // Check if the task exists
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const events = await storage.getTaskCalendarEvents(taskId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving task calendar events" });
    }
  });

  // Create a new calendar event
  app.post("/api/calendar-events", async (req, res) => {
    try {
      console.log("Received event data:", JSON.stringify(req.body));
      
      // Parse and validate the data
      const validatedData = insertCalendarEventSchema.parse(req.body);
      
      // Convert string dates to Date objects if needed
      const eventData = {
        ...validatedData,
        start: validatedData.start instanceof Date ? 
          validatedData.start : new Date(validatedData.start),
        end: validatedData.end instanceof Date ? 
          validatedData.end : new Date(validatedData.end),
      };
      
      console.log("Processed event data:", JSON.stringify({
        ...eventData,
        start: eventData.start.toISOString(),
        end: eventData.end.toISOString()
      }));
      
      // If a taskId is provided, check if the task exists
      if (eventData.taskId) {
        const task = await storage.getTask(eventData.taskId);
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }
      }
      
      const newEvent = await storage.createCalendarEvent(eventData);
      res.status(201).json(newEvent);
    } catch (error) {
      console.error("Calendar event creation error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid calendar event data", 
          debug: JSON.stringify(error.errors),
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating calendar event" });
    }
  });

  // Update a calendar event
  app.patch("/api/calendar-events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid calendar event ID" });
      }

      console.log("Updating event data:", JSON.stringify(req.body));
      
      // Partial validation of the update data
      const validatedData = insertCalendarEventSchema.partial().parse(req.body);
      
      // Process data - convert string dates to Date objects if provided
      const eventData: Partial<InsertCalendarEvent> = { ...validatedData };
      
      if (eventData.start) {
        eventData.start = eventData.start instanceof Date ? 
          eventData.start : new Date(eventData.start);
      }
      
      if (eventData.end) {
        eventData.end = eventData.end instanceof Date ? 
          eventData.end : new Date(eventData.end);
      }
      
      // If taskId is provided, check if the task exists
      if (eventData.taskId) {
        const task = await storage.getTask(eventData.taskId);
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }
      }
      
      const updatedEvent = await storage.updateCalendarEvent(id, eventData);
      
      if (!updatedEvent) {
        return res.status(404).json({ message: "Calendar event not found" });
      }

      res.json(updatedEvent);
    } catch (error) {
      console.error("Calendar event update error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid calendar event data", 
          debug: JSON.stringify(error.errors), 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error updating calendar event" });
    }
  });

  // Delete a calendar event
  app.delete("/api/calendar-events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid calendar event ID" });
      }

      const deleted = await storage.deleteCalendarEvent(id);
      if (!deleted) {
        return res.status(404).json({ message: "Calendar event not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting calendar event" });
    }
  });

  // Pomodoro Session Routes
  // ======================
  
  // Get all pomodoro sessions for a user
  app.get("/api/users/:userId/pomodoro-sessions", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check if the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const sessions = await storage.getPomodoroSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving pomodoro sessions" });
    }
  });

  // Get pomodoro session by id
  app.get("/api/pomodoro-sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }

      const session = await storage.getPomodoroSession(id);
      if (!session) {
        return res.status(404).json({ message: "Pomodoro session not found" });
      }

      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving pomodoro session" });
    }
  });

  // Get pomodoro sessions for a specific task
  app.get("/api/tasks/:taskId/pomodoro-sessions", async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      // Check if the task exists
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const sessions = await storage.getTaskPomodoroSessions(taskId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving task pomodoro sessions" });
    }
  });

  // Create a new pomodoro session
  app.post("/api/pomodoro-sessions", async (req, res) => {
    try {
      // Parse and validate the data
      const validatedData = insertPomodoroSessionSchema.parse(req.body);
      
      // Process data - convert string dates to Date objects if needed
      const sessionData = {
        ...validatedData,
        startTime: validatedData.startTime instanceof Date ? 
          validatedData.startTime : new Date(validatedData.startTime),
        endTime: validatedData.endTime ? 
          (validatedData.endTime instanceof Date ? validatedData.endTime : new Date(validatedData.endTime)) 
          : null
      };
      
      // Check if the user exists
      const user = await storage.getUser(sessionData.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // If a taskId is provided, check if the task exists
      if (sessionData.taskId) {
        const task = await storage.getTask(sessionData.taskId);
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }
      }
      
      const newSession = await storage.createPomodoroSession(sessionData);
      res.status(201).json(newSession);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid pomodoro session data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating pomodoro session" });
    }
  });

  // Update a pomodoro session
  app.patch("/api/pomodoro-sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pomodoro session ID" });
      }

      // Partial validation of the update data
      const validatedData = insertPomodoroSessionSchema.partial().parse(req.body);
      
      // Process data - convert string dates to Date objects if needed
      const sessionData: Partial<typeof validatedData> = { ...validatedData };
      
      if (sessionData.startTime) {
        sessionData.startTime = sessionData.startTime instanceof Date ? 
          sessionData.startTime : new Date(sessionData.startTime);
      }
      
      if (sessionData.endTime !== undefined) {
        sessionData.endTime = sessionData.endTime === null ? 
          null : (sessionData.endTime instanceof Date ? 
            sessionData.endTime : new Date(sessionData.endTime));
      }
      
      // If userId is provided, check if the user exists
      if (sessionData.userId) {
        const user = await storage.getUser(sessionData.userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
      }
      
      // If taskId is provided, check if the task exists
      if (sessionData.taskId) {
        const task = await storage.getTask(sessionData.taskId);
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }
      }
      
      const updatedSession = await storage.updatePomodoroSession(id, sessionData);
      
      if (!updatedSession) {
        return res.status(404).json({ message: "Pomodoro session not found" });
      }

      res.json(updatedSession);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid pomodoro session data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error updating pomodoro session" });
    }
  });

  // Delete a pomodoro session
  app.delete("/api/pomodoro-sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pomodoro session ID" });
      }

      const deleted = await storage.deletePomodoroSession(id);
      if (!deleted) {
        return res.status(404).json({ message: "Pomodoro session not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting pomodoro session" });
    }
  });

  // Forest Tree Routes
  // =================
  
  // Get all forest trees
  app.get("/api/forest-trees", async (req, res) => {
    try {
      // Since we know we have one default user with ID 1, just get all trees for that user for now
      const trees = await storage.getForestTrees(1);
      res.json(trees);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving forest trees" });
    }
  });
  
  // Get all forest trees for a user
  app.get("/api/users/:userId/forest-trees", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check if the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const trees = await storage.getForestTrees(userId);
      res.json(trees);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving forest trees" });
    }
  });

  // Get forest tree by id
  app.get("/api/forest-trees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tree ID" });
      }

      const tree = await storage.getForestTree(id);
      if (!tree) {
        return res.status(404).json({ message: "Forest tree not found" });
      }

      res.json(tree);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving forest tree" });
    }
  });

  // Create a new forest tree
  app.post("/api/forest-trees", async (req, res) => {
    try {
      // Parse and validate the data
      const validatedData = insertForestTreeSchema.parse(req.body);
      
      // Process data - convert string dates to Date objects if needed
      const treeData = {
        ...validatedData,
        plantedAt: validatedData.plantedAt instanceof Date ? 
          validatedData.plantedAt : validatedData.plantedAt ? new Date(validatedData.plantedAt) : new Date()
      };
      
      // Check if the user exists
      const user = await storage.getUser(treeData.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if the pomodoro session exists
      const session = await storage.getPomodoroSession(treeData.pomodoroSessionId);
      if (!session) {
        return res.status(404).json({ message: "Pomodoro session not found" });
      }
      
      const newTree = await storage.createForestTree(treeData);
      res.status(201).json(newTree);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid forest tree data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating forest tree" });
    }
  });

  // Update a forest tree
  app.patch("/api/forest-trees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid forest tree ID" });
      }

      // Partial validation of the update data
      const validatedData = insertForestTreeSchema.partial().parse(req.body);
      
      // Process data - convert string dates to Date objects if needed
      const treeData: Partial<typeof validatedData> = { ...validatedData };
      
      if (treeData.plantedAt) {
        treeData.plantedAt = treeData.plantedAt instanceof Date ? 
          treeData.plantedAt : new Date(treeData.plantedAt);
      }
      
      // If userId is provided, check if the user exists
      if (treeData.userId) {
        const user = await storage.getUser(treeData.userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
      }
      
      // If pomodoroSessionId is provided, check if the session exists
      if (treeData.pomodoroSessionId) {
        const session = await storage.getPomodoroSession(treeData.pomodoroSessionId);
        if (!session) {
          return res.status(404).json({ message: "Pomodoro session not found" });
        }
      }
      
      const updatedTree = await storage.updateForestTree(id, treeData);
      
      if (!updatedTree) {
        return res.status(404).json({ message: "Forest tree not found" });
      }

      res.json(updatedTree);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid forest tree data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error updating forest tree" });
    }
  });

  // Delete a forest tree
  app.delete("/api/forest-trees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid forest tree ID" });
      }

      const deleted = await storage.deleteForestTree(id);
      if (!deleted) {
        return res.status(404).json({ message: "Forest tree not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting forest tree" });
    }
  });

  // User Routes
  // ===========
  
  // Get user by id
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't return the password in the response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving user" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
