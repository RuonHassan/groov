import { 
  tasks, type Task, type InsertTask,
  calendarEvents, type CalendarEvent, type InsertCalendarEvent,
  users, type User, type InsertUser,
  // Add imports for connected calendar types from shared schema
  type ConnectedCalendar, type InsertConnectedCalendar 
} from "@shared/schema";

// Modify the interface with all CRUD methods needed for the GTD app
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
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
  
  // Connected Calendar methods
  getConnectedCalendars(userId: number): Promise<ConnectedCalendar[]>;
  getConnectedCalendar(id: number): Promise<ConnectedCalendar | undefined>;
  createConnectedCalendar(calendar: InsertConnectedCalendar): Promise<ConnectedCalendar>;
  updateConnectedCalendar(id: number, calendar: Partial<ConnectedCalendar>): Promise<ConnectedCalendar | undefined>;
  deleteConnectedCalendar(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private calendarEvents: Map<number, CalendarEvent>;
  private connectedCalendars: Map<number, ConnectedCalendar>;
  
  private taskCurrentId: number;
  private calendarEventCurrentId: number;
  private userCurrentId: number;
  private connectedCalendarCurrentId: number;
  
  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.calendarEvents = new Map();
    this.connectedCalendars = new Map();
    
    this.taskCurrentId = 1;
    this.calendarEventCurrentId = 1;
    this.userCurrentId = 1;
    this.connectedCalendarCurrentId = 1;
    
    // Setup example data
    this.setupExampleData();
  }
  
  private async setupExampleData() {
    // Example tasks
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Create example user
    await this.createUser({
      username: "demo",
      password: "password123", // This would be hashed in a real app
      email: "demo@example.com",
    });

    // Create some example tasks
    const exampleTasks: InsertTask[] = [
      {
        title: "Review quarterly reports",
        notes: "Go through Q3 financial reports before the meeting",
        status: "next",
        context: "work",
        energy: "high",
        priority: "high",
        time: 60,
        dueDate: new Date().toISOString(),
      },
      {
        title: "Prepare presentation for client meeting",
        notes: "Slides should include project timeline and budget breakdown",
        status: "next",
        context: "work",
        energy: "high",
        priority: "high",
        time: 90,
        dueDate: new Date(nextWeek).toISOString(),
      },
      {
        title: "Replace kitchen light bulbs",
        notes: "Need to buy new LED bulbs first",
        status: "next",
        context: "home",
        energy: "low",
        priority: "medium",
        time: 15,
        dueDate: null,
      },
      {
        title: "Schedule dentist appointment",
        notes: "Ask about that sensitive tooth",
        status: "waiting",
        context: "errands",
        energy: "low",
        priority: "medium",
        time: 10,
        dueDate: null,
      },
      {
        title: "Research new productivity apps",
        notes: "Look for something with Pomodoro and GTD features",
        status: "someday",
        context: "computer",
        energy: "medium",
        priority: "low",
        time: 45,
        dueDate: null,
      },
      {
        title: "Plan summer vacation",
        notes: "Check flight prices to Hawaii and Mexico",
        status: "someday",
        context: "planning",
        energy: "medium",
        priority: "low",
        time: 120,
        dueDate: null,
      },
      {
        title: "Update resume",
        notes: "Add recent projects and update skills section",
        status: "inbox",
        context: null,
        energy: null,
        priority: null,
        time: null,
        dueDate: null,
      },
      {
        title: "Buy birthday gift for mom",
        notes: "She mentioned wanting that cookbook",
        status: "inbox",
        context: null,
        energy: null,
        priority: null,
        time: null,
        dueDate: null,
      },
      {
        title: "Clean out garage",
        notes: "Donate old sports equipment and organize tools",
        status: "project",
        context: "home",
        energy: "high",
        priority: "medium",
        time: 180,
        dueDate: null,
      },
      {
        title: "Learn React Native",
        notes: "Work through the tutorial and build a sample app",
        status: "project",
        context: "computer",
        energy: "high",
        priority: "low",
        time: null,
        dueDate: null,
      },
      {
        title: "Fix leaking faucet",
        notes: "Watch YouTube tutorial first to see what tools I need",
        status: "completed",
        context: "home",
        energy: "medium",
        priority: "high",
        time: 30,
        dueDate: new Date(yesterday).toISOString(),
        completedAt: new Date(yesterday).toISOString(),
      },
      {
        title: "Pay electric bill",
        notes: "Due on the 15th",
        status: "completed",
        context: "finances",
        energy: "low",
        priority: "high",
        time: 5,
        dueDate: new Date(threeDaysAgo).toISOString(),
        completedAt: new Date(twoDaysAgo).toISOString(),
      },
    ];
    
    for (const task of exampleTasks) {
      await this.createTask(task);
    }
    
    // Create calendar events
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(9, 0, 0, 0);
    
    const todayEnd = new Date(today);
    todayEnd.setHours(10, 0, 0, 0);
    
    const todayLunchStart = new Date(today);
    todayLunchStart.setHours(12, 0, 0, 0);
    
    const todayLunchEnd = new Date(today);
    todayLunchEnd.setHours(13, 0, 0, 0);
    
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(today.getDate() + 1);
    tomorrowStart.setHours(14, 0, 0, 0);
    
    const tomorrowEnd = new Date(today);
    tomorrowEnd.setDate(today.getDate() + 1);
    tomorrowEnd.setHours(15, 30, 0, 0);
    
    const exampleEvents: InsertCalendarEvent[] = [
      {
        title: "Team standup",
        description: "Daily team check-in",
        start: todayStart,
        end: todayEnd,
        taskId: null,
      },
      {
        title: "Lunch with Alex",
        description: "Discuss new project ideas",
        start: todayLunchStart,
        end: todayLunchEnd,
        taskId: null,
      },
      {
        title: "Client presentation",
        description: "Present project timeline",
        start: tomorrowStart,
        end: tomorrowEnd,
        taskId: 2, // Connect to "Prepare presentation" task
      },
    ];
    
    for (const event of exampleEvents) {
      await this.createCalendarEvent(event);
    }
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const now = new Date();
    
    const newUser: User = {
      id,
      username: user.username,
      password: user.password, // In a real app, this would be hashed
      email: user.email || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      ...userData,
      updatedAt: new Date(),
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Task methods
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }
  
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }
  
  async createTask(task: InsertTask): Promise<Task> {
    const id = this.taskCurrentId++;
    const now = new Date();
    
    const newTask: Task = {
      id,
      title: task.title,
      notes: task.notes || null,
      status: task.status || "inbox",
      context: task.context || null,
      energy: task.energy || null,
      priority: task.priority || null,
      time: task.time || null,
      dueDate: task.dueDate || null,
      completedAt: task.completedAt || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.tasks.set(id, newTask);
    return newTask;
  }
  
  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return undefined;
    
    // Handle special case: if status is being set to "completed" and
    // completedAt is not explicitly provided, set it to current time
    if (task.status === "completed" && existingTask.status !== "completed" && !task.completedAt) {
      task.completedAt = new Date().toISOString();
    }
    
    const updatedTask = {
      ...existingTask,
      ...task,
      updatedAt: new Date(),
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async deleteTask(id: number): Promise<boolean> {
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
    return Array.from(this.calendarEvents.values()).filter(
      (event) => event.taskId === taskId
    );
  }
  
  async createCalendarEvent(eventData: InsertCalendarEvent): Promise<CalendarEvent> {
    const id = this.calendarEventCurrentId++;
    const now = new Date();
    
    const newEvent: CalendarEvent = {
      id,
      title: eventData.title,
      description: eventData.description || null,
      start: eventData.start instanceof Date ? eventData.start : new Date(eventData.start),
      end: eventData.end instanceof Date ? eventData.end : new Date(eventData.end),
      taskId: eventData.taskId || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.calendarEvents.set(id, newEvent);
    return newEvent;
  }
  
  async updateCalendarEvent(id: number, eventData: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined> {
    const existingEvent = this.calendarEvents.get(id);
    if (!existingEvent) return undefined;
    
    // Process dates if provided
    const processedData: Partial<CalendarEvent> = { ...eventData };
    if (eventData.start) {
      processedData.start = eventData.start instanceof Date ? 
        eventData.start : new Date(eventData.start);
    }
    if (eventData.end) {
      processedData.end = eventData.end instanceof Date ? 
        eventData.end : new Date(eventData.end);
    }
    
    const updatedEvent = {
      ...existingEvent,
      ...processedData,
      updatedAt: new Date(),
    };
    
    this.calendarEvents.set(id, updatedEvent);
    return updatedEvent;
  }
  
  async deleteCalendarEvent(id: number): Promise<boolean> {
    return this.calendarEvents.delete(id);
  }
  
  // Connected Calendar methods
  async getConnectedCalendars(userId: number): Promise<ConnectedCalendar[]> {
    return Array.from(this.connectedCalendars.values()).filter(
      calendar => calendar.user_id === userId
    );
  }
  
  async getConnectedCalendar(id: number): Promise<ConnectedCalendar | undefined> {
    return this.connectedCalendars.get(id);
  }
  
  async createConnectedCalendar(calendarData: InsertConnectedCalendar): Promise<ConnectedCalendar> {
    const id = this.connectedCalendarCurrentId++;
    const now = new Date();
    
    const newCalendar: ConnectedCalendar = {
      id,
      user_id: calendarData.user_id,
      provider: calendarData.provider,
      calendar_id: calendarData.calendar_id,
      calendar_name: calendarData.calendar_name,
      access_token: calendarData.access_token,
      refresh_token: calendarData.refresh_token,
      token_expires_at: calendarData.token_expires_at,
      is_primary: calendarData.is_primary,
      is_enabled: calendarData.is_enabled,
      created_at: now.toISOString(),
      last_synced_at: null
    };
    
    this.connectedCalendars.set(id, newCalendar);
    return newCalendar;
  }
  
  async updateConnectedCalendar(id: number, calendarData: Partial<ConnectedCalendar>): Promise<ConnectedCalendar | undefined> {
    const existingCalendar = this.connectedCalendars.get(id);
    if (!existingCalendar) return undefined;
    
    const updatedCalendar = {
      ...existingCalendar,
      ...calendarData,
    };
    
    this.connectedCalendars.set(id, updatedCalendar);
    return updatedCalendar;
  }
  
  async deleteConnectedCalendar(id: number): Promise<boolean> {
    return this.connectedCalendars.delete(id);
  }
}

// Create and export storage instance
export const storage = new MemStorage();
