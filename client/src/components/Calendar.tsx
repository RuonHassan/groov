import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, isWithinInterval } from 'date-fns';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, CalendarEvent } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Time slot definition (30 minute intervals)
interface TimeSlot {
  hour: number;
  minute: number;
  formatted: string;
}

// Generate time slots for the day (from 7am to 10pm)
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 7; hour < 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const isPM = hour >= 12;
      const displayHour = hour % 12 || 12;
      const formattedTime = `${displayHour}:${minute === 0 ? '00' : minute} ${isPM ? 'PM' : 'AM'}`;
      slots.push({ hour, minute, formatted: formattedTime });
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

// Schema for event form
const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  taskId: z.string().optional(),
  start: z.string().min(1, "Start time is required"),
  end: z.string().min(1, "End time is required"),
  notes: z.string().optional(),
  color: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface CalendarProps {
  tasks: Task[];
  onRefetch: () => void;
}

export default function Calendar({ tasks, onRefetch }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; slot: TimeSlot } | null>(null);
  const { toast } = useToast();

  // Form for adding/editing events
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      taskId: "",
      start: "",
      end: "",
      notes: "",
      color: "#3b82f6",
    },
  });

  // Load calendar events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const result = await apiRequest('/api/calendar-events');
        setEvents(result as CalendarEvent[]);
      } catch (error) {
        console.error("Error fetching calendar events:", error);
        toast({
          title: "Error",
          description: "Failed to load calendar events",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [toast]);

  // Calculate week range
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Week starts on Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  // Generate array of dates for current week
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // Navigate to previous week
  const goToPreviousWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, -7));
  };

  // Navigate to next week
  const goToNextWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, 7));
  };

  // Format the weekday header
  const formatWeekdayHeader = (date: Date) => {
    return format(date, 'EEE');
  };

  // Format the date in the header
  const formatDateHeader = (date: Date) => {
    return format(date, 'd');
  };

  // Check if an event is in a specific time slot
  const isEventInTimeSlot = (event: CalendarEvent, date: Date, timeSlot: TimeSlot) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const slotStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      timeSlot.hour,
      timeSlot.minute
    );
    const slotEnd = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      timeSlot.hour,
      timeSlot.minute + 30
    );

    return isWithinInterval(slotStart, { start: eventStart, end: eventEnd }) ||
      isWithinInterval(eventEnd, { start: slotStart, end: slotEnd }) ||
      (eventStart <= slotStart && eventEnd >= slotEnd);
  };

  // Get events for a specific day and time slot
  const getEventsForTimeSlot = (date: Date, timeSlot: TimeSlot) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return isSameDay(eventDate, date) && isEventInTimeSlot(event, date, timeSlot);
    });
  };

  // Handle click on a time slot to create a new event
  const handleTimeSlotClick = (date: Date, slot: TimeSlot) => {
    // Calculate end time (1 hour after start time)
    const endTime = { ...slot };
    if (slot.minute === 30) {
      endTime.hour += 1;
      endTime.minute = 0;
    } else {
      endTime.minute = 30;
    }
    
    // Find end time in slots array
    const endSlot = timeSlots.find(s => s.hour === endTime.hour && s.minute === endTime.minute) || 
      timeSlots[timeSlots.indexOf(slot) + 1] || slot;
    
    form.reset({
      title: "",
      taskId: "",
      start: `${date.toISOString().split('T')[0]}T${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`,
      end: `${date.toISOString().split('T')[0]}T${endTime.hour.toString().padStart(2, '0')}:${endTime.minute.toString().padStart(2, '0')}`,
      notes: "",
      color: "#3b82f6",
    });
    
    setSelectedSlot({ date, slot });
    setSelectedEvent(null);
    setShowEventForm(true);
  };

  // Handle click on an event to edit it
  const handleEventClick = (event: CalendarEvent) => {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    form.reset({
      title: event.title,
      taskId: event.taskId ? event.taskId.toString() : "",
      start: format(startDate, "yyyy-MM-dd'T'HH:mm"),
      end: format(endDate, "yyyy-MM-dd'T'HH:mm"),
      notes: event.notes || "",
      color: event.color || "#3b82f6",
    });
    
    setSelectedEvent(event);
    setSelectedSlot(null);
    setShowEventForm(true);
  };

  // Handle form submission
  const onSubmit = async (data: EventFormValues) => {
    try {
      const startDate = new Date(data.start);
      const endDate = new Date(data.end);
      
      if (endDate <= startDate) {
        toast({
          title: "Invalid time range",
          description: "End time must be after start time",
          variant: "destructive"
        });
        return;
      }
      
      const eventData = {
        title: data.title,
        taskId: data.taskId ? parseInt(data.taskId) : null,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        notes: data.notes || null,
        color: data.color || "#3b82f6"
      };
      
      if (selectedEvent) {
        // Update existing event
        await apiRequest(`/api/calendar-events/${selectedEvent.id}`, {
          method: 'PATCH',
          body: JSON.stringify(eventData),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        toast({
          title: "Event updated",
          description: "Calendar event has been updated successfully",
        });
      } else {
        // Create new event
        await apiRequest('/api/calendar-events', {
          method: 'POST',
          body: JSON.stringify(eventData),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        toast({
          title: "Event created",
          description: "New calendar event has been created successfully",
        });
      }
      
      // Refresh events
      const result = await apiRequest('/api/calendar-events');
      setEvents(result as CalendarEvent[]);
      
      // Refresh tasks if an event is linked to a task
      if (data.taskId) {
        onRefetch();
      }
      
      setShowEventForm(false);
    } catch (error) {
      console.error("Error saving calendar event:", error);
      toast({
        title: "Error",
        description: "Failed to save calendar event",
        variant: "destructive",
      });
    }
  };

  // Handle event deletion
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      await apiRequest(`/api/calendar-events/${selectedEvent.id}`, { 
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      toast({
        title: "Event deleted",
        description: "Calendar event has been deleted successfully",
      });
      
      // Refresh events
      const result = await apiRequest('/api/calendar-events');
      setEvents(result as CalendarEvent[]);
      
      // Refresh tasks if an event was linked to a task
      if (selectedEvent.taskId) {
        onRefetch();
      }
      
      setShowEventForm(false);
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      toast({
        title: "Error",
        description: "Failed to delete calendar event",
        variant: "destructive",
      });
    }
  };

  // Get color based on task status or custom color
  const getEventColor = (event: CalendarEvent) => {
    if (event.color) return event.color;
    
    // Find task if event is linked to a task
    if (event.taskId) {
      const task = tasks.find(t => t.id === event.taskId);
      if (task) {
        // Color based on task status
        switch(task.status) {
          case 'next': return '#3b82f6'; // blue
          case 'waiting': return '#f59e0b'; // amber
          case 'project': return '#8b5cf6'; // purple
          case 'someday': return '#6b7280'; // gray
          default: return '#3b82f6'; // blue
        }
      }
    }
    
    return '#3b82f6'; // default blue
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-white p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {format(weekStart, 'MMMM d')} - {format(weekEnd, 'MMMM d, yyyy')}
          </h2>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, index) => (
            <div key={index} className="text-center">
              <div className="text-sm font-medium text-gray-500">
                {formatWeekdayHeader(day)}
              </div>
              <div className={`text-sm font-semibold ${
                isSameDay(day, new Date()) ? 'bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto' : ''
              }`}>
                {formatDateHeader(day)}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 grid-flow-col h-full">
          {/* Time Labels (first column) */}
          <div className="border-r border-gray-200 pr-2 text-right">
            {timeSlots.map((slot, index) => (
              <div 
                key={index} 
                className="h-14 flex items-center justify-end"
              >
                <span className="text-xs text-gray-500">{slot.formatted}</span>
              </div>
            ))}
          </div>
          
          {/* Calendar columns (days) */}
          {weekDays.map((day, dayIndex) => (
            <div key={dayIndex} className="border-r border-gray-200">
              {/* Time slots */}
              {timeSlots.map((slot, slotIndex) => {
                const slotEvents = getEventsForTimeSlot(day, slot);
                return (
                  <div 
                    key={slotIndex} 
                    className={`h-14 border-b border-gray-100 relative ${
                      slotIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                    onClick={() => handleTimeSlotClick(day, slot)}
                  >
                    {/* Events in this slot */}
                    {slotEvents.map((event, eventIndex) => (
                      <div
                        key={eventIndex}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
                        className="absolute left-0 right-0 m-1 p-1 rounded text-xs overflow-hidden cursor-pointer text-white z-10"
                        style={{ 
                          backgroundColor: getEventColor(event),
                          opacity: 0.9
                        }}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        {event.taskId && (
                          <div className="text-xs opacity-90 truncate">
                            {tasks.find(t => t.id === event.taskId)?.title || 'Task'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Event Form Dialog */}
      <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
            <DialogDescription>
              {selectedEvent 
                ? 'Edit the details of your calendar event' 
                : 'Add a new event to your calendar. You can optionally link it to a task.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Event title" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="taskId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Task (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a task (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {tasks
                          .filter(task => task.status !== 'done')
                          .map(task => (
                            <SelectItem key={task.id} value={task.id.toString()}>
                              {task.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Add notes" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input type="color" {...field} className="h-10 w-full" />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex justify-between sm:justify-between">
                {selectedEvent && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteEvent}
                  >
                    Delete
                  </Button>
                )}
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEventForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {selectedEvent ? 'Update' : 'Create'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}