import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertTaskSchema, 
  insertCalendarEventSchema, 
  type InsertCalendarEvent,
  type InsertConnectedCalendar
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
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Invalid calendar event data",
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
        return res.status(400).json({ message: "Invalid event ID" });
      }

      // Partial validation of the update data
      const validatedData = insertCalendarEventSchema.partial().parse(req.body);
      
      // If a taskId is provided, check if the task exists
      if (validatedData.taskId) {
        const task = await storage.getTask(validatedData.taskId);
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }
      }
      
      const updatedEvent = await storage.updateCalendarEvent(id, validatedData);
      
      if (!updatedEvent) {
        return res.status(404).json({ message: "Calendar event not found" });
      }

      res.json(updatedEvent);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Invalid calendar event data",
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
        return res.status(400).json({ message: "Invalid event ID" });
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

  // Connected Calendar Routes
  // =====================
  
  // Get all connected calendars for a user
  app.get("/api/users/:userId/connected-calendars", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const connectedCalendars = await storage.getConnectedCalendars(userId);
      res.json(connectedCalendars);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving connected calendars" });
    }
  });
  
  // Create a new connected calendar
  app.post("/api/connected-calendars", async (req, res) => {
    try {
      const data = req.body as InsertConnectedCalendar;
      
      // Validate that the user exists
      const user = await storage.getUser(data.user_id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const result = await storage.createConnectedCalendar(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: "Error connecting calendar" });
    }
  });
  
  // Update a connected calendar
  app.patch("/api/connected-calendars/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid connected calendar ID" });
      }
      
      const updatedCalendar = await storage.updateConnectedCalendar(id, req.body);
      
      if (!updatedCalendar) {
        return res.status(404).json({ message: "Connected calendar not found" });
      }
      
      res.json(updatedCalendar);
    } catch (error) {
      res.status(500).json({ message: "Error updating connected calendar" });
    }
  });
  
  // Delete a connected calendar
  app.delete("/api/connected-calendars/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid connected calendar ID" });
      }
      
      const deleted = await storage.deleteConnectedCalendar(id);
      if (!deleted) {
        return res.status(404).json({ message: "Connected calendar not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting connected calendar" });
    }
  });

  // Create and return the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
