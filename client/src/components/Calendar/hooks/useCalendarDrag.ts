import { useState } from 'react';
import { Task } from '@shared/schema';
import { DragState } from '../utils/types';
import { useToast } from '@/hooks/use-toast';
import { useTaskContext } from '@/contexts/TaskContext';
import { calculateTaskPosition } from '../utils/timeUtils';

export function useCalendarDrag(onRefetch?: () => void) {
  const [dragState, setDragState] = useState<DragState>({
    draggedTask: null,
    dragOverSlot: null,
    isDragging: false,
    dragGhost: null,
    dragGhostPosition: null
  });

  const { toast } = useToast();
  const { updateTask } = useTaskContext();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    e.stopPropagation();
    setDragState(prev => ({ ...prev, draggedTask: task }));

    // Clone the current element for the drag image
    const originalElement = e.currentTarget;
    const dragImage = originalElement.cloneNode(true) as HTMLElement;
    
    // Set up the ghost image container with fixed dimensions
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.width = '200px';
    dragImage.style.height = '32px';
    dragImage.style.backgroundColor = task.color || '#3b82f6';
    dragImage.style.borderRadius = '4px';
    dragImage.style.padding = '4px 8px';
    dragImage.style.opacity = '0.9';
    dragImage.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    dragImage.style.pointerEvents = 'none';
    dragImage.style.transform = 'none';
    dragImage.style.left = '0';
    
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 100, 16);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, timeSlotElement: HTMLElement) => {
    e.preventDefault();
    const rect = timeSlotElement.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const isTopHalf = relativeY < rect.height / 2;
    const hour = parseInt(timeSlotElement.dataset.hour || "0");
    const minute = parseInt(timeSlotElement.dataset.minute || "0");
    const date = new Date(timeSlotElement.dataset.date || "");

    setDragState(prev => ({
      ...prev,
      dragOverSlot: `${date.toISOString()}-${hour}-${minute}-${isTopHalf ? '0' : '15'}`
    }));
  };

  const handleDragLeave = () => {
    setDragState(prev => ({ ...prev, dragOverSlot: null }));
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, timeSlotElement: HTMLElement, date: Date) => {
    e.preventDefault();
    setDragState(prev => ({ ...prev, dragOverSlot: null }));
    
    if (!dragState.draggedTask) return;

    const newTimes = calculateTaskPosition(e.nativeEvent, timeSlotElement, date, dragState.draggedTask);
    if (!newTimes) return;

    try {
      await updateTask(dragState.draggedTask.id, {
        start_time: newTimes.startTime.toISOString(),
        end_time: newTimes.endTime.toISOString()
      });

      toast({
        title: "Task rescheduled",
        description: `"${dragState.draggedTask.title}" has been moved`
      });
      
      if (onRefetch) onRefetch();
    } catch (error) {
      console.error("Failed to update task:", error);
      toast({
        title: "Error",
        description: "Failed to reschedule task",
        variant: "destructive"
      });
    }

    setDragState(prev => ({ ...prev, draggedTask: null }));
  };

  const handleDragEnd = () => {
    setDragState(prev => ({
      ...prev,
      draggedTask: null,
      dragOverSlot: null
    }));
  };

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  };
} 