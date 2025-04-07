import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color hex").optional().default("#3b82f6"),
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
      title: "",
      notes: "",
      color: "#3b82f6",
      startTime: "",
      endTime: "",
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
        color: "#3b82f6",
        startTime: formatDateTimeLocal(defaultStartTime),
        endTime: formatDateTimeLocal(defaultEndTime),
      });
    } else if (!open) {
      form.reset({
        title: "",
        notes: "",
        color: "#3b82f6",
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "New Task"}</DialogTitle>
          <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="What needs to be done?" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
            
            <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Add details..." rows={3} {...field} value={field.value || ""} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />

            <Accordion type="single" collapsible className="w-full space-y-2">
              <AccordionItem value="date-time" className="border rounded-md px-3">
                <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium">
                   <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Date & Time</div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-4 px-1 space-y-4">
                   <FormField control={form.control} name="startTime" render={({ field }) => (
                       <FormItem>
                         <FormLabel>Start Time</FormLabel>
                         <FormControl><Input type="datetime-local" {...field} value={field.value || ""} /></FormControl>
                         <FormMessage />
                       </FormItem>
                   )} />
                    <FormField control={form.control} name="endTime" render={({ field }) => (
                       <FormItem>
                         <FormLabel>End Time</FormLabel>
                         <FormControl><Input type="datetime-local" {...field} value={field.value || ""} /></FormControl>
                         <FormMessage />
                       </FormItem>
                   )} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="color" className="border rounded-md px-3">
                 <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium">
                    <div className="flex items-center gap-2"><Palette className="h-4 w-4" /> Color</div>
                 </AccordionTrigger>
                 <AccordionContent className="pt-4 pb-4 px-1">
                    <FormField control={form.control} name="color" render={({ field }) => (
                       <FormItem>
                         <FormLabel>Select Color</FormLabel>
                         <FormControl><Input type="color" {...field} className="h-10 w-full p-1" /></FormControl>
                         <FormMessage />
                       </FormItem>
                   )} />
                 </AccordionContent>
               </AccordionItem>
            </Accordion> 
            
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
