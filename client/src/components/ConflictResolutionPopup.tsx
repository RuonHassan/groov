import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task } from "@shared/schema";
import { format } from "date-fns";
import { Clock, AlertTriangle } from "lucide-react";

interface ConflictingEvent {
  start_time: string;
  end_time: string;
  title?: string;
}

export interface ConflictResolution {
  action: "schedule_anyway" | "move_moveable_tasks" | "reschedule_new_task";
  moveableConflictsToMove?: ConflictingEvent[];
}

interface ConflictResolutionPopupProps {
  open: boolean;
  onClose: () => void;
  onResolve: (resolution: ConflictResolution) => void;
  task: Task;
  specifiedTime: Date;
  moveableConflicts: ConflictingEvent[];
  immoveableConflicts: ConflictingEvent[];
}

export default function ConflictResolutionPopup({ 
  open, 
  onClose, 
  onResolve, 
  task, 
  specifiedTime, 
  moveableConflicts,
  immoveableConflicts 
}: ConflictResolutionPopupProps) {
  const handleScheduleAnyway = () => {
    onResolve({ action: "schedule_anyway" });
    onClose();
  };

  const handleMoveMoveable = () => {
    // Move all moveable conflicting tasks
    onResolve({ action: "move_moveable_tasks", moveableConflictsToMove: moveableConflicts });
    onClose();
  };

  const handleRescheduleNewTask = () => {
    onResolve({ action: "reschedule_new_task" });
    onClose();
  };

  // Format conflicts for display
  const formatConflictTime = (conflict: ConflictingEvent) => {
    try {
      const start = new Date(conflict.start_time);
      const end = new Date(conflict.end_time);
      return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
    } catch {
      return "Invalid time";
    }
  };

  const getConflictTitle = (conflict: ConflictingEvent) => {
    return conflict.title || "Untitled Event";
  };

  const totalConflicts = moveableConflicts.length + immoveableConflicts.length;
  const hasImmoveableConflicts = immoveableConflicts.length > 0;
  const hasMoveableConflicts = moveableConflicts.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[420px] w-[calc(100%-1rem)] !sm:max-w-[420px] rounded-lg">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg">Time Conflict</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600">
            {totalConflicts === 1 
              ? `There's calendar event scheduled at ${format(specifiedTime, 'EEEE h:mm a')}.`
              : `Your task would overlap with ${totalConflicts} existing events at ${format(specifiedTime, 'EEEE h:mm a')}.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {hasImmoveableConflicts && (
            <div>
              <h4 className="mb-3 font-medium text-sm text-gray-900">
                Calendar Events:
              </h4>
              <div className="space-y-2">
                {immoveableConflicts.map((conflict, index) => (
                  <div key={index}>
                    <div className="font-medium text-gray-900 text-sm">{getConflictTitle(conflict)}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{formatConflictTime(conflict)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasMoveableConflicts && (
            <div>
              <h4 className="mb-3 font-medium text-sm text-gray-900">
                ✅ Your Tasks (can be moved):
              </h4>
              <div className="space-y-2">
                {moveableConflicts.map((conflict, index) => (
                  <div key={index}>
                    <div className="font-medium text-gray-900 text-sm">{getConflictTitle(conflict)}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{formatConflictTime(conflict)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <div className="flex gap-2 w-full">
            {hasImmoveableConflicts && (
              <Button 
                variant="outline"
                onClick={handleScheduleAnyway}
                className="flex-1"
              >
                {hasImmoveableConflicts ? "Schedule Anyway" : "Schedule Together"}
              </Button>
            )}
            
            {hasMoveableConflicts && (
              <Button 
                onClick={handleMoveMoveable}
                className="flex-1"
              >
                Move Your Tasks & Schedule Here
              </Button>
            )}
            
            <Button 
              onClick={handleRescheduleNewTask}
              className="flex-1"
            >
              Schedule This Task Later
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 