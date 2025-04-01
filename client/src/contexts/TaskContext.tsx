import { createContext, useContext, useState, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Task, InsertTask } from "@shared/schema";

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  error: Error | null;
  currentView: string;
  setCurrentView: (view: string) => void;
  currentContext: string;
  setCurrentContext: (context: string) => void;
  energyFilter: string;
  setEnergyFilter: (energy: string) => void;
  sortOrder: string;
  setSortOrder: (order: string) => void;
  addTask: (task: InsertTask) => Promise<Task>;
  updateTask: (id: number, task: Partial<InsertTask>) => Promise<Task | undefined>;
  deleteTask: (id: number) => Promise<void>;
  filteredTasks: Task[];
  viewTitle: string;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState("all");
  const [currentContext, setCurrentContext] = useState("all");
  const [energyFilter, setEnergyFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("priority");
  
  // Fetch tasks
  const { 
    data: tasks = [], 
    isLoading, 
    error 
  } = useQuery<Task[]>({ 
    queryKey: ["/api/tasks"],
  });

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async (newTask: InsertTask) => {
      const res = await apiRequest("POST", "/api/tasks", newTask);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task added",
        description: "Task has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, task }: { id: number; task: Partial<InsertTask> }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, task);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task updated",
        description: "Task has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Function to add a new task
  const addTask = async (task: InsertTask): Promise<Task> => {
    return addTaskMutation.mutateAsync(task);
  };

  // Function to update a task
  const updateTask = async (id: number, task: Partial<InsertTask>): Promise<Task | undefined> => {
    return updateTaskMutation.mutateAsync({ id, task });
  };

  // Function to delete a task
  const deleteTask = async (id: number): Promise<void> => {
    return deleteTaskMutation.mutateAsync(id);
  };

  // Filter tasks based on currentView, currentContext, and energyFilter
  const filteredTasks = tasks.filter(task => {
    let viewMatch = true;
    let contextMatch = true;
    let energyMatch = true;

    // Filter by view (task status)
    if (currentView !== "all") {
      viewMatch = task.status === currentView;
    }

    // Filter by context
    if (currentContext !== "all") {
      contextMatch = task.context === currentContext;
    }

    // Filter by energy level
    if (energyFilter !== "all") {
      energyMatch = task.energy === energyFilter;
    }

    return viewMatch && contextMatch && energyMatch;
  }).sort((a, b) => {
    // Sort by the selected sort order
    if (sortOrder === "priority") {
      const priorityMap = { high: 1, medium: 2, low: 3 };
      return (priorityMap[a.priority as keyof typeof priorityMap] || 999) - 
             (priorityMap[b.priority as keyof typeof priorityMap] || 999);
    } else if (sortOrder === "dueDate") {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    } else if (sortOrder === "energy") {
      const energyMap = { low: 1, medium: 2, high: 3 };
      return (energyMap[a.energy as keyof typeof energyMap] || 999) - 
             (energyMap[b.energy as keyof typeof energyMap] || 999);
    } else if (sortOrder === "time") {
      return (a.time || 999) - (b.time || 999);
    }
    return 0;
  });

  // Determine the view title based on currentView
  let viewTitle = "All Tasks";
  if (currentView === "inbox") {
    viewTitle = "Inbox (Capture)";
  } else if (currentView === "next") {
    viewTitle = "Next Actions";
  } else if (currentView === "waiting") {
    viewTitle = "Waiting For";
  } else if (currentView === "project") {
    viewTitle = "Projects";
  } else if (currentView === "someday") {
    viewTitle = "Someday/Maybe";
  } else if (currentView === "done") {
    viewTitle = "Completed Tasks";
  }

  return (
    <TaskContext.Provider
      value={{
        tasks,
        isLoading,
        error: error as Error | null,
        currentView,
        setCurrentView,
        currentContext,
        setCurrentContext,
        energyFilter,
        setEnergyFilter,
        sortOrder,
        setSortOrder,
        addTask,
        updateTask,
        deleteTask,
        filteredTasks,
        viewTitle,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error("useTaskContext must be used within a TaskProvider");
  }
  return context;
}
