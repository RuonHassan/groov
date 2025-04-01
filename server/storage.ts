import { 
  tasks, type Task, type InsertTask,
  calendarEvents, type CalendarEvent, type InsertCalendarEvent,
  users, type User, type InsertUser,
  taskSchema, calendarEventSchema
} from "@shared/schema";

// Modify the interface with all CRUD methods needed for the GTD app
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Task methods
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Calendar event methods
  getCalendarEvents(): Promise<CalendarEvent[]>;
  getCalendarEvent(id: number): Promise<CalendarEvent | undefined>;
  getTaskCalendarEvents(taskId: number): Promise<CalendarEvent[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private calendarEvents: Map<number, CalendarEvent>;
  private userCurrentId: number;
  private taskCurrentId: number;
  private calendarEventCurrentId: number;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.calendarEvents = new Map();
    this.userCurrentId = 1;
    this.taskCurrentId = 1;
    this.calendarEventCurrentId = 1;

    // Add example tasks
    this.setupExampleData();
  }

  private setupExampleData() {
    // Example tasks
    const exampleTasks: InsertTask[] = [
      {
        title: "Review quarterly reports",
        notes: "Check financial performance and update team metrics",
        status: "next",
        context: "work",
        priority: "high",
        dueDate: "2025-04-15",
        time: 60,
        energy: "high"
      },
      {
        title: "Schedule dentist appointment",
        notes: "Call Dr. Smith's office",
        status: "waiting",
        context: "calls",
        priority: "medium",
        energy: "low"
      },
      {
        title: "Replace kitchen light bulbs",
        notes: "Need to buy LED bulbs first",
        status: "next",
        context: "home",
        priority: "low",
        energy: "medium",
        time: 15
      },
      {
        title: "Pick up dry cleaning",
        notes: "Receipt is in wallet",
        status: "next",
        context: "errands",
        priority: "medium",
        dueDate: "2025-04-05",
        energy: "low",
        time: 20
      },
      {
        title: "Plan family vacation",
        notes: "Research destinations and create budget",
        status: "project",
        context: "home",
        priority: "medium",
        energy: "high",
      },
      {
        title: "Learn Spanish",
        notes: "Find a good app or online course",
        status: "someday",
        context: "home",
        priority: "low",
        energy: "high",
      },
      {
        title: "Update resume",
        notes: "Add recent projects and skills",
        status: "next",
        context: "work",
        priority: "medium",
        energy: "medium",
        time: 45
      },
      {
        title: "Buy birthday gift for mom",
        notes: "She mentioned wanting a new cookbook",
        status: "next",
        context: "errands",
        priority: "high",
        dueDate: "2025-04-20",
        energy: "medium",
        time: 30
      }
    ];

    // Create tasks
    const createdTasks: Task[] = [];
    exampleTasks.forEach(async (task) => {
      const createdTask = await this.createTask(task);
      createdTasks.push(createdTask);
    });

    // Create example calendar events
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    const exampleEvents: InsertCalendarEvent[] = [
      {
        taskId: 1, // Review quarterly reports
        title: "Quarterly Report Review",
        start: new Date(new Date(tomorrow).setHours(10, 0, 0)),
        end: new Date(new Date(tomorrow).setHours(11, 0, 0)),
        notes: "Block time to review the quarterly reports",
        color: "#3b82f6"
      },
      {
        taskId: 7, // Update resume
        title: "Update Resume",
        start: new Date(new Date(tomorrow).setHours(14, 0, 0)),
        end: new Date(new Date(tomorrow).setHours(15, 0, 0)),
        notes: "Work on resume updates",
        color: "#2563eb"
      },
      {
        // Stand-alone event (no task)
        title: "Team Meeting",
        start: new Date(new Date(today).setHours(15, 0, 0)),
        end: new Date(new Date(today).setHours(16, 0, 0)),
        notes: "Weekly team sync",
        color: "#10b981"
      }
    ];
    
    // Create calendar events
    exampleEvents.forEach(async (event) => {
      await this.createCalendarEvent(event);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Task methods
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskCurrentId++;
    const now = new Date();
    
    // Create task with properly typed fields
    const task: Task = {
      id,
      title: insertTask.title,
      notes: insertTask.notes || null,
      status: insertTask.status || "inbox",
      context: insertTask.context || "work",
      priority: insertTask.priority || "medium",
      dueDate: insertTask.dueDate || null,
      time: insertTask.time || null,
      energy: insertTask.energy || "medium",
      delegatedTo: insertTask.delegatedTo || null,
      createdAt: now,
      updatedAt: now,
      scheduled: insertTask.scheduled || false
    };
    
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) {
      return undefined;
    }

    // Create updated task with proper typing
    const updatedTask: Task = {
      ...existingTask,
      title: taskUpdate.title || existingTask.title,
      notes: taskUpdate.notes !== undefined ? taskUpdate.notes : existingTask.notes,
      status: taskUpdate.status || existingTask.status,
      context: taskUpdate.context || existingTask.context,
      priority: taskUpdate.priority || existingTask.priority,
      dueDate: taskUpdate.dueDate !== undefined ? taskUpdate.dueDate : existingTask.dueDate,
      time: taskUpdate.time !== undefined ? taskUpdate.time : existingTask.time,
      energy: taskUpdate.energy || existingTask.energy,
      delegatedTo: taskUpdate.delegatedTo !== undefined ? taskUpdate.delegatedTo : existingTask.delegatedTo,
      scheduled: taskUpdate.scheduled !== undefined ? taskUpdate.scheduled : existingTask.scheduled,
      updatedAt: new Date()
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    // Delete associated calendar events
    Array.from(this.calendarEvents.entries())
      .filter(([_, event]) => event.taskId === id)
      .forEach(([eventId, _]) => {
        this.calendarEvents.delete(eventId);
      });
      
    return this.tasks.delete(id);
  }

  // Calendar event methods
  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values());
  }
  
  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    return this.calendarEvents.get(id);
  }
  
  async getTaskCalendarEvents(taskId: number): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values())
      .filter(event => event.taskId === taskId);
  }
  
  async createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    const id = this.calendarEventCurrentId++;
    const now = new Date();
    
    // Create event with properly typed fields
    const event: CalendarEvent = {
      id,
      taskId: insertEvent.taskId || null,
      title: insertEvent.title,
      start: insertEvent.start instanceof Date ? insertEvent.start : new Date(insertEvent.start),
      end: insertEvent.end instanceof Date ? insertEvent.end : new Date(insertEvent.end),
      allDay: insertEvent.allDay || false,
      notes: insertEvent.notes || null,
      color: insertEvent.color || "#3b82f6",
      createdAt: now,
      updatedAt: now
    };
    
    this.calendarEvents.set(id, event);
    
    // If this event is linked to a task, mark the task as scheduled
    if (event.taskId) {
      const task = this.tasks.get(event.taskId);
      if (task) {
        this.updateTask(event.taskId, { scheduled: true });
      }
    }
    
    return event;
  }
  
  async updateCalendarEvent(id: number, eventUpdate: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined> {
    const existingEvent = this.calendarEvents.get(id);
    
    if (!existingEvent) {
      return undefined;
    }
    
    // Create updated event with proper typing
    const updatedEvent: CalendarEvent = {
      ...existingEvent,
      title: eventUpdate.title || existingEvent.title,
      taskId: eventUpdate.taskId !== undefined ? eventUpdate.taskId : existingEvent.taskId,
      start: eventUpdate.start ? (eventUpdate.start instanceof Date ? eventUpdate.start : new Date(eventUpdate.start)) : existingEvent.start,
      end: eventUpdate.end ? (eventUpdate.end instanceof Date ? eventUpdate.end : new Date(eventUpdate.end)) : existingEvent.end,
      allDay: eventUpdate.allDay !== undefined ? eventUpdate.allDay : existingEvent.allDay,
      notes: eventUpdate.notes !== undefined ? eventUpdate.notes : existingEvent.notes,
      color: eventUpdate.color || existingEvent.color,
      updatedAt: new Date()
    };
    
    this.calendarEvents.set(id, updatedEvent);
    return updatedEvent;
  }
  
  async deleteCalendarEvent(id: number): Promise<boolean> {
    const event = this.calendarEvents.get(id);
    
    if (event && event.taskId) {
      // Check if this is the only event for this task
      const otherEvents = Array.from(this.calendarEvents.values())
        .filter(e => e.id !== id && e.taskId === event.taskId);
      
      // If no other events exist for this task, mark task as unscheduled
      if (otherEvents.length === 0) {
        const task = this.tasks.get(event.taskId);
        if (task) {
          this.updateTask(event.taskId, { scheduled: false });
        }
      }
    }
    
    return this.calendarEvents.delete(id);
  }
}

export const storage = new MemStorage();
