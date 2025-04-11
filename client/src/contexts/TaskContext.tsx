import { createContext, useContext, useState, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
// import { apiRequest } from "@/lib/queryClient"; // Removed as likely unused now
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// Use updated Task and InsertTask types which include start_time/end_time
import { Task, InsertTask } from "@shared/schema"; 
import { supabase } from "@/lib/supabaseClient";

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  error: Error | null;
  sortOrder: string;
  setSortOrder: (order: string) => void;
  addTask: (taskPayload: Record<string, any>) => Promise<Task>;
  updateTask: (id: number, taskPayload: Record<string, any>) => Promise<Task | undefined>;
  deleteTask: (id: number) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [sortOrder, setSortOrder] = useState("startTime");
  
  // Fetch tasks query - Fetches snake_case, maps to camelCase Task type?
  // Check if Task type definition needs update or if mapping happens automatically
  const { 
    data: tasks = [], 
    isLoading, 
    error 
  } = useQuery<Task[], Error>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Supabase error fetching tasks:", error);
        throw new Error(error.message || 'Failed to fetch tasks from Supabase');
      }
      
      return data || [];
    },
  });

  // Add task mutation: Accepts snake_case payload
  const addTaskMutation = useMutation<Task, Error, Record<string, any>>({ 
    mutationFn: async (newTaskPayload: Record<string, any>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(newTaskPayload) // Pass snake_case payload directly
        .select()
        .single();

      if (error) {
        console.error("Supabase error adding task:", error);
        throw new Error(error.message || 'Failed to add task');
      }
      if (!data) {
        throw new Error('No data returned after adding task');
      }
      return data as Task; // This cast might be incorrect if Task type is camelCase
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "Task added",
        description: `Task "${data.title}" has been created successfully.`,
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

  // Update task mutation: Accepts snake_case payload
  const updateTaskMutation = useMutation<Task | undefined, Error, { id: number; taskPayload: Record<string, any> }>({
    mutationFn: async ({ id, taskPayload }: { id: number; taskPayload: Record<string, any> }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(taskPayload) // Pass snake_case payload directly
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Supabase error updating task:", error);
        throw new Error(error.message || 'Failed to update task');
      }
      return data ? data as Task : undefined; // This cast might be incorrect
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "Task updated",
        description: `Task "${data?.title || ''}" has been updated successfully.`,
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

  // Delete task mutation (remains the same)
  const deleteTaskMutation = useMutation<void, Error, number>({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Supabase error deleting task:", error);
        throw new Error(error.message || 'Failed to delete task');
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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

  // Context provider functions now accept snake_case payload
  const addTask = async (taskPayload: Record<string, any>): Promise<Task> => {
    return addTaskMutation.mutateAsync(taskPayload);
  };
  const updateTask = async (id: number, taskPayload: Record<string, any>): Promise<Task | undefined> => {
    return updateTaskMutation.mutateAsync({ id, taskPayload });
  };
  const deleteTask = async (id: number): Promise<void> => {
    return deleteTaskMutation.mutateAsync(id);
  };

  // Sort tasks directly
  const sortedTasks = tasks.sort((a, b) => {
    if (sortOrder === "startTime") {
      // Sort by start_time (snake_case)
      const timeA = (a as any).start_time ? new Date((a as any).start_time).getTime() : Infinity;
      const timeB = (b as any).start_time ? new Date((b as any).start_time).getTime() : Infinity;
      return timeA - timeB;
    } else if (sortOrder === "title") {
      // Title is likely the same in DB and JS type
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  return (
    <TaskContext.Provider
      value={{
        tasks: sortedTasks, // Provide sorted tasks
        isLoading,
        error: error as Error | null,
        sortOrder,
        setSortOrder,
        addTask,
        updateTask,
        deleteTask,
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
