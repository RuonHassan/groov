import { Button } from "@/components/ui/button";
import { CalendarClock, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGoogleCalendar } from '@/contexts/GoogleCalendarContext';
import { useOutlookCalendar } from '@/contexts/OutlookCalendarContext';
import GoogleCalendarButton from "./GoogleCalendarButton";
import OutlookCalendarButton from "./OutlookCalendarButton";

interface CalendarSettingsPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CalendarSettingsPopup({ open, onOpenChange }: CalendarSettingsPopupProps) {
  const { isConnected } = useGoogleCalendar();
  const { isConnected: isOutlookConnected } = useOutlookCalendar();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-xl">
        <DialogHeader>
          <DialogTitle>Calendars</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            {/* Google Calendar */}
            <div className="flex items-center justify-between space-x-2 p-3 rounded-lg border">
              <div className="flex items-center space-x-3">
                <CalendarClock className="h-5 w-5" />
                <div>
                  <h4 className="font-medium">Google Calendar</h4>
                  {isConnected && (
                    <div className="flex items-center space-x-1 text-xs text-green-600">
                      <Check className="h-3 w-3" />
                      <span>Connected</span>
                    </div>
                  )}
                </div>
              </div>
              <GoogleCalendarButton />
            </div>

            {/* Outlook Calendar */}
            <div className="flex items-center justify-between space-x-2 p-3 rounded-lg border">
              <div className="flex items-center space-x-3">
                <CalendarClock className="h-5 w-5" />
                <div>
                  <h4 className="font-medium">Outlook Calendar</h4>
                  {isOutlookConnected && (
                    <div className="flex items-center space-x-1 text-xs text-green-600">
                      <Check className="h-3 w-3" />
                      <span>Connected</span>
                    </div>
                  )}
                </div>
              </div>
              <OutlookCalendarButton />
            </div>

            {/* Apple Calendar - Coming Soon */}
            <div className="flex items-center justify-between space-x-2 p-3 rounded-lg border opacity-50">
              <div className="flex items-center space-x-3">
                <CalendarClock className="h-5 w-5" />
                <div>
                  <h4 className="font-medium">Apple Calendar</h4>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 