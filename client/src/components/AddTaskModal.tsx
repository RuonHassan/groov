import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { InsertTask, Task } from "@shared/schema";
import { useTaskContext } from "@/contexts/TaskContext";
import { X, Calendar, Clock, Palette } from "lucide-react";
import { formatISO, parseISO, isValid } from 'date-fns';

// Function to format Date object or ISO string into yyyy-MM-ddTHH:mm for datetime-local input
const formatDateTimeLocal = (date: string | Date | null | undefined): string => {
  if (!date) return "";
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return "";
    // Format to YYYY-MM-DDTHH:mm (local time)
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error("Error formatting date for input:", date, error);
    return "";
  }
};

// Helper to convert datetime-local string to ISO string or null
const formatToISO = (dateTimeLocal: string | null | undefined): string | null => {
  if (!dateTimeLocal) return null;
  try {
    const date = new Date(dateTimeLocal);
    return isValid(date) ? date.toISOString() : null;
  } catch {
    return null;
  }
};

// Simplified form validation schema
const taskFormValidationSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  notes: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color hex").optional().default("#5D2E8C"),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
}).refine(data => {
  if (data.startTime && data.endTime) {
    try { return new Date(data.endTime) > new Date(data.startTime); } catch { return false; }
  }
  return true; 
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});

// Simplified form values type
type TaskFormValues = z.infer<typeof taskFormValidationSchema>;

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task;
  isEditing?: boolean;
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
}

export default function AddTaskModal({ open, onClose, task, isEditing = false, defaultStartTime, defaultEndTime }: AddTaskModalProps) {
  const { addTask, updateTask } = useTaskContext();
  
  // Form with simplified schema and defaults
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormValidationSchema),
    defaultValues: {
      title: task?.title || "",
      notes: task?.notes || "",
      color: task?.color || "#5D2E8C",
      startTime: task?.start_time || defaultStartTime || "",
      endTime: task?.end_time || defaultEndTime || "",
    },
  });

  // useEffect: Map snake_case DB data to camelCase form fields
  useEffect(() => {
    if (task && isEditing) {
      form.reset({
        title: task.title,
        notes: task.notes || "",
        // Read snake_case from task object
        color: (task as any).color || "#3b82f6", 
        startTime: formatDateTimeLocal((task as any).start_time), // Read snake_case
        endTime: formatDateTimeLocal((task as any).end_time),     // Read snake_case
      });
    } else if (!isEditing && open) {
      form.reset({
        title: "",
        notes: "",
        color: "#5D2E8C",
        startTime: formatDateTimeLocal(defaultStartTime),
        endTime: formatDateTimeLocal(defaultEndTime),
      });
    } else if (!open) {
      form.reset({
        title: "",
        notes: "",
        color: "#5D2E8C",
        startTime: "",
        endTime: "",
      });
    }
  }, [task, isEditing, open, form, defaultStartTime, defaultEndTime]);

  // onSubmit: Prepare payload with explicit snake_case keys matching DB schema
  const onSubmit = async (formData: TaskFormValues) => {
    const payload: Record<string, any> = {
      // Map form camelCase to DB snake_case
      title: formData.title,
      notes: formData.notes,
      color: formData.color,
      start_time: formatToISO(formData.startTime),
      end_time: formatToISO(formData.endTime),
      // user_id: ... // Add user_id here when auth is implemented
    };
    
    // Remove null/undefined values to avoid sending them
    Object.keys(payload).forEach(key => 
        (payload[key] === undefined || payload[key] === null) && 
        delete payload[key]
    );
    
    console.log("Sending explicit snake_case payload:", payload);

    try {
      if (isEditing && task) {
        // Pass snake_case payload
        await updateTask(task.id, payload); 
      } else {
        // Pass snake_case payload
        await addTask(payload); 
      }
      onClose(); 
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-lg pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormControl><Input placeholder="What needs to be done?" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
            
            <div className="flex gap-2 items-start">
              <FormField control={form.control} name="startTime" render={({ field }) => (
                     <FormItem className="flex-1">
                       <FormControl><Input type="datetime-local" {...field} value={field.value || ""} placeholder="Start time" /></FormControl>
                       <FormMessage />
                     </FormItem>
                 )} />
              <FormField control={form.control} name="endTime" render={({ field }) => (
                     <FormItem className="flex-1">
                       <FormControl><Input type="datetime-local" {...field} value={field.value || ""} placeholder="End time" /></FormControl>
                       <FormMessage />
                     </FormItem>
                 )} />
            </div>
           
            <FormField control={form.control} name="color" render={({ field }) => (
                   <FormItem>
                     <FormControl><Input type="color" {...field} className="h-10 w-full p-0 border-0 rounded-md" /></FormControl>
                     <FormMessage />
                   </FormItem>
               )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormControl><Textarea placeholder="Add details..." rows={3} {...field} value={field.value || ""} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
            
            <DialogFooter className="pt-4">
              <Button type="submit">
                 {isEditing ? "Save Changes" : "Create Task"}
               </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
