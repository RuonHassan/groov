import { useState } from 'react';
import { Task } from '@shared/schema';
import { TouchState } from '../utils/types';
import { useToast } from '@/hooks/use-toast';
import { useTaskContext } from '@/contexts/TaskContext';
import { format } from 'date-fns';

export function useCalendarTouch(onRefetch?: () => void) {
  const [touchState, setTouchState] = useState<TouchState>({
    touchDragTask: null,
    touchStartY: null,
    longPressTimeout: null
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragGhost, setDragGhost] = useState<HTMLElement | null>(null);
  const [dragGhostPosition, setDragGhostPosition] = useState<{ x: number; y: number } | null>(null);

  const { toast } = useToast();
  const { updateTask } = useTaskContext();

  const createDragGhost = (task: Task, color: string, x: number, y: number) => {
    const ghost = document.createElement('div');
    ghost.className = 'absolute rounded p-1 text-xs overflow-hidden z-50 shadow-md pointer-events-none';
    ghost.style.backgroundColor = color;
    ghost.style.width = '200px';
    ghost.style.height = '32px';
    ghost.style.transform = 'translate(-50%, -50%)';
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
    ghost.style.opacity = '0.9';
    ghost.style.color = 'white';
    ghost.style.padding = '8px';
    ghost.textContent = task.title;

    document.body.appendChild(ghost);
    setDragGhost(ghost);
    setDragGhostPosition({ x, y });
  };

  const updateDragGhostPosition = (x: number, y: number) => {
    if (dragGhost) {
      dragGhost.style.left = `${x}px`;
      dragGhost.style.top = `${y}px`;
      setDragGhostPosition({ x, y });
    }
  };

  const removeDragGhost = () => {
    if (dragGhost) {
      document.body.removeChild(dragGhost);
      setDragGhost(null);
      setDragGhostPosition(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, task: Task, color: string) => {
    if (task.completed_at) return;
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    setTouchState(prev => ({ ...prev, touchStartY: touch.pageY }));
    
    const timer = setTimeout(() => {
      setTouchState(prev => ({ ...prev, touchDragTask: task }));
      setIsDragging(true);
      
      // Add visual feedback to original task
      const element = e.currentTarget as HTMLElement;
      element.style.opacity = '0.5';

      // Create ghost at touch position with offset to be visible above finger
      createDragGhost(
        task,
        color,
        touch.pageX,
        touch.pageY - 50 // Offset upward to be visible above finger
      );
    }, 500);

    setTouchState(prev => ({ ...prev, longPressTimeout: timer }));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchState.touchDragTask || !isDragging) return;
    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    updateDragGhostPosition(touch.pageX, touch.pageY - 50);
  };

  const handleTouchEnd = async (e: React.TouchEvent, timeSlotElement: HTMLElement | null) => {
    if (touchState.longPressTimeout) {
      clearTimeout(touchState.longPressTimeout);
    }

    removeDragGhost();

    if (!touchState.touchDragTask || !isDragging || !timeSlotElement) {
      resetTouchState();
      return;
    }

    const touch = e.changedTouches[0];
    const hour = parseInt(timeSlotElement.dataset.hour || "0");
    const minute = parseInt(timeSlotElement.dataset.minute || "0");
    const day = new Date(timeSlotElement.dataset.date || "");
    const rect = timeSlotElement.getBoundingClientRect();
    const relativeY = touch.clientY - rect.top;
    const isTopHalf = relativeY < rect.height / 2;

    const startTime = new Date(day);
    startTime.setHours(hour, minute + (isTopHalf ? 0 : 15));

    // Calculate the original duration
    const originalStart = new Date(touchState.touchDragTask.start_time!);
    const originalEnd = new Date(touchState.touchDragTask.end_time!);
    const durationInMinutes = (originalEnd.getTime() - originalStart.getTime()) / (1000 * 60);

    // Create end time by adding the original duration
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + durationInMinutes);

    try {
      await updateTask(touchState.touchDragTask.id, {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      });

      toast({
        title: "Task rescheduled",
        description: `"${touchState.touchDragTask.title}" has been moved to ${format(startTime, 'h:mm a')}`
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

    resetTouchState();
  };

  const resetTouchState = () => {
    setTouchState({
      touchDragTask: null,
      touchStartY: null,
      longPressTimeout: null
    });
    setIsDragging(false);
    setDragGhostPosition(null);
  };

  return {
    touchState,
    isDragging,
    dragGhostPosition,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetTouchState
  };
} 