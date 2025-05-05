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
import { X, Calendar, Clock, Palette, Trash2 } from "lucide-react";
import { formatISO, parseISO, isValid } from 'date-fns';
import { RangeTimePicker } from "@/components/ui/date-time-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

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
const formatToISO = (date: Date | undefined | null): string | null => {
  if (!date) return null;
  try {
    return isValid(date) ? date.toISOString() : null;
  } catch {
    return null;
  }
};

// Simplified form validation schema
const taskFormValidationSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  notes: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color hex").optional().default("#6C584C"),
  startTime: z.date().optional().nullable(),
  endTime: z.date().optional().nullable(),
}).refine(data => {
  if (data.startTime && data.endTime) {
    return data.endTime > data.startTime;
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
  const { addTask, updateTask, deleteTask } = useTaskContext();
  const { user } = useAuth();
  const [defaultTaskColor, setDefaultTaskColor] = useState("#6C584C");
  
  // Fetch user's default task color
  useEffect(() => {
    const fetchDefaultColor = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('default_task_color')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (data?.default_task_color) {
          setDefaultTaskColor(data.default_task_color);
        }
      } catch (error) {
        console.error('Error fetching default task color:', error);
      }
    };

    fetchDefaultColor();
  }, [user?.id]);
  
  // Form with simplified schema and defaults
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormValidationSchema),
    defaultValues: {
      title: task?.title || "",
      notes: task?.notes || "",
      color: task?.color || defaultTaskColor,
      startTime: task?.start_time ? parseISO(task.start_time) : (defaultStartTime ? parseISO(defaultStartTime) : null),
      endTime: task?.end_time ? parseISO(task.end_time) : (defaultEndTime ? parseISO(defaultEndTime) : null),
    },
  });

  // useEffect: Map snake_case DB data to camelCase form fields
  useEffect(() => {
    if (task && isEditing) {
      form.reset({
        title: task.title,
        notes: task.notes || "",
        color: (task as any).color || defaultTaskColor,
        startTime: (task as any).start_time ? parseISO((task as any).start_time) : null,
        endTime: (task as any).end_time ? parseISO((task as any).end_time) : null,
      });
    } else if (!isEditing && open) {
      form.reset({
        title: "",
        notes: "",
        color: defaultTaskColor,
        startTime: defaultStartTime ? parseISO(defaultStartTime) : null,
        endTime: defaultEndTime ? parseISO(defaultEndTime) : null,
      });
    } else if (!open) {
      form.reset({
        title: "",
        notes: "",
        color: defaultTaskColor,
        startTime: null,
        endTime: null,
      });
    }
  }, [task, isEditing, open, form, defaultStartTime, defaultEndTime, defaultTaskColor]);

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

  const handleDelete = async () => {
    if (task) {
      try {
        await deleteTask(task.id);
        onClose();
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[400px] sm:!max-w-[400px] md:!max-w-[450px] p-6 rounded-lg overflow-hidden">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormControl><Input placeholder="What needs to be done?" {...field} className="w-full" /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
            
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <RangeTimePicker
                      startDate={field.value || undefined}
                      endDate={form.getValues("endTime") || undefined}
                      onRangeChange={(start, end) => {
                        form.setValue("startTime", start || null);
                        form.setValue("endTime", end || null);
                      }}
                      placeholder="Select time range"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
           
            <FormField control={form.control} name="color" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <ColorPicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormControl><Textarea placeholder="Add details..." rows={3} {...field} value={field.value || ""} className="w-full" /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
            
            <DialogFooter className="pt-4 flex justify-between items-center gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  className="mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
              <Button type="submit" className="w-full sm:w-auto">
                {isEditing ? "Save Changes" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
