import React from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, Video, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleEventModalProps {
  open: boolean;
  onClose: () => void;
  event: {
    summary: string;
    description?: string;
    start: { dateTime: string };
    end: { dateTime: string };
    location?: string;
  } | null;
}

export default function GoogleEventModal({ open, onClose, event }: GoogleEventModalProps) {
  if (!event) return null;

  const startDate = new Date(event.start.dateTime);
  const endDate = new Date(event.end.dateTime);

  // Function to extract Zoom link from description
  const extractZoomInfo = (description: string) => {
    const zoomLinkMatch = description.match(/https:\/\/[\w-]+\.zoom\.us\/[^\s<]+/);
    const meetingIdMatch = description.match(/Meeting ID: (\d+)/);
    
    return {
      link: zoomLinkMatch ? zoomLinkMatch[0] : null,
      meetingId: meetingIdMatch ? meetingIdMatch[1] : null
    };
  };

  // Function to clean and format description
  const formatDescription = (description: string) => {
    if (!description) return null;
    
    // Remove HTML tags and clean up the text
    const cleanText = description
      .replace(/<[^>]+>/g, '\n') // Replace HTML tags with newlines
      .replace(/\n\s*\n/g, '\n') // Remove multiple consecutive newlines
      .replace(/^\s+|\s+$/g, ''); // Trim whitespace
    
    return cleanText;
  };

  const zoomInfo = event.description ? extractZoomInfo(event.description) : null;
  const cleanDescription = event.description ? formatDescription(event.description) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{event.summary}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="font-medium">
                {format(startDate, 'EEEE, MMMM d, yyyy')}
              </p>
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>
                  {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                </span>
              </div>
            </div>
          </div>

          {event.location && (
            <div className="flex items-start space-x-3">
              <div className="h-5 w-5 text-gray-500 mt-0.5">📍</div>
              <p className="text-gray-700">{event.location}</p>
            </div>
          )}

          {zoomInfo?.link && (
            <div className="flex flex-col space-y-2 bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center space-x-3">
                <Video className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Zoom Meeting</span>
              </div>
              {zoomInfo.meetingId && (
                <p className="text-sm text-blue-800 ml-8">Meeting ID: {zoomInfo.meetingId}</p>
              )}
              <Button 
                variant="outline" 
                className="ml-8 mt-1"
                onClick={() => window.open(zoomInfo.link!, '_blank')}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Join Zoom Meeting
              </Button>
            </div>
          )}

          {cleanDescription && !cleanDescription.includes('inviting you to a scheduled Zoom meeting') && (
            <div className="flex items-start space-x-3">
              <div className="h-5 w-5 text-gray-500 mt-0.5">📝</div>
              <div className="text-gray-700 whitespace-pre-wrap">{cleanDescription}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 