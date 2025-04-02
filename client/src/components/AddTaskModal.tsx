import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { z } from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { insertTaskSchema } from "@shared/schema";
import { useTaskContext } from "@/contexts/TaskContext";
import { X, Calendar, Clock, Bookmark, AlertCircle, Tag } from "lucide-react";
import { Task } from "@shared/schema";

// Extend the task schema with client-side validation
const taskSchema = insertTaskSchema.extend({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters",
  }),
});

// Create a type for the form values
type TaskFormValues = z.infer<typeof taskSchema>;

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task;
  isEditing?: boolean;
}

export default function AddTaskModal({ open, onClose, task, isEditing = false }: AddTaskModalProps) {
  const { addTask, updateTask } = useTaskContext();
  const [showScheduleConfirm, setShowScheduleConfirm] = useState(false);
  const [, setLocation] = useLocation();
  
  // Get form with validation
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      notes: "",
      status: "inbox",
      context: "work",
      priority: "medium",
      dueDate: undefined,
      time: undefined,
      energy: "medium",
      delegatedTo: "",
    },
  });

  // Update form values when editing an existing task
  useEffect(() => {
    if (task && isEditing) {
      form.reset({
        title: task.title,
        notes: task.notes || "",
        status: task.status,
        context: task.context,
        priority: task.priority,
        dueDate: task.dueDate ? String(task.dueDate) : undefined,
        time: task.time,
        energy: task.energy,
        delegatedTo: task.delegatedTo || "",
      });
    }
  }, [task, isEditing, form]);

  // Reset form when modal is closed
  useEffect(() => {
    if (!open && !isEditing) {
      form.reset();
    }
  }, [open, form, isEditing]);

  // Handle form submission
  const onSubmit = async (data: TaskFormValues) => {
    try {
      if (isEditing && task) {
        await updateTask(task.id, data);
      } else {
        await addTask(data);
      }
      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  // Handle scheduling a task
  const handleScheduleTask = async () => {
    // First save/update the task
    try {
      const data = form.getValues();
      let taskId: number;
      
      if (isEditing && task) {
        const updatedTask = await updateTask(task.id, data);
        taskId = updatedTask!.id;
      } else {
        const newTask = await addTask(data);
        taskId = newTask.id;
      }
      
      // Close the current modal
      onClose();
      
      // Navigate to calendar page with task ID as a parameter
      setLocation(`/calendar?taskId=${taskId}`);
    } catch (error) {
      console.error("Error scheduling task:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "New Task"}</DialogTitle>
          <DialogDescription>
            Enter task details and use folders below to categorize and set parameters.
          </DialogDescription>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional details" 
                      rows={3} 
                      {...field} 
                      value={field.value || ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Accordion type="multiple" className="w-full">
              {/* Status and Context Folder */}
              <AccordionItem value="status" className="border rounded-md px-2">
                <AccordionTrigger className="py-2 hover:no-underline">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Bookmark className="h-4 w-4" />
                    <span>Status & Context</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2 pb-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status <span className="text-red-500">*</span></FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="inbox">Inbox (Capture)</SelectItem>
                                <SelectItem value="next">Next Action</SelectItem>
                                <SelectItem value="waiting">Waiting For</SelectItem>
                                <SelectItem value="project">Project</SelectItem>
                                <SelectItem value="someday">Someday/Maybe</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="context"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Context</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select context" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="work">Work</SelectItem>
                                <SelectItem value="home">Home</SelectItem>
                                <SelectItem value="errands">Errands</SelectItem>
                                <SelectItem value="calls">Calls</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {form.watch("status") === "waiting" && (
                      <FormField
                        control={form.control}
                        name="delegatedTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delegated To</FormLabel>
                            <FormControl>
                              <Input placeholder="Who is responsible?" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Priority and Due Date Folder */}
              <AccordionItem value="priority" className="border rounded-md px-2 mt-2">
                <AccordionTrigger className="py-2 hover:no-underline">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertCircle className="h-4 w-4" />
                    <span>Priority & Due Date</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2 pb-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field}
                                value={field.value || ""}  
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Time and Energy Folder */}
              <AccordionItem value="time" className="border rounded-md px-2 mt-2">
                <AccordionTrigger className="py-2 hover:no-underline">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    <span>Time & Energy</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2 pb-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time Required (minutes)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Estimated minutes" 
                                min={1}
                                {...field}
                                value={field.value || ""} 
                                onChange={(e) => {
                                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="energy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Energy Level Required</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select energy level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <DialogFooter className="flex justify-between sm:justify-between">
              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                >
                  Cancel
                </Button>
                
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={() => handleScheduleTask()}
                  className="flex items-center gap-1"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Schedule</span>
                </Button>
              </div>
              
              <Button type="submit">
                {isEditing ? "Update Task" : "Save Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
