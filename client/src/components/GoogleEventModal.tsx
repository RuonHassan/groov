import React, { useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, Video, Link as LinkIcon, Users, ChevronDown, ChevronRight, MapPin, FileText } from "lucide-react";
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
    attendees?: {
      email: string;
      displayName?: string;
      responseStatus?: string;
    }[];
    conferenceData?: {
      conferenceId?: string;
      entryPoints?: {
        entryPointType: string;
        uri: string;
        label?: string;
        meetingCode?: string;
        passcode?: string;
        pin?: string;
      }[];
    };
  } | null;
}

export default function GoogleEventModal({ open, onClose, event }: GoogleEventModalProps) {
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  if (!event) return null;

  const startDate = new Date(event.start.dateTime);
  const endDate = new Date(event.end.dateTime);

  // Enhanced function to extract Zoom information from both conferenceData and description
  const extractZoomInfo = () => {
    // First check conferenceData for Zoom information
    if (event.conferenceData?.entryPoints) {
      const videoEntry = event.conferenceData.entryPoints.find(ep => 
        ep.uri?.toLowerCase().includes('zoom.us') || 
        ep.uri?.toLowerCase().includes('zoomgov.com')
      );
      
      if (videoEntry) {
        return {
          link: videoEntry.uri,
          meetingId: videoEntry.meetingCode,
          passcode: videoEntry.passcode,
          isZoomMeeting: true
        };
      }
    }

    // If no Zoom info in conferenceData, check description
    if (event.description) {
      // Match various Zoom link formats
      const zoomLinkPatterns = [
        /https:\/\/[\w-]*\.?zoom\.us\/[^\s<>"']+/i,
        /https:\/\/[\w-]*\.?zoomgov\.com\/[^\s<>"']+/i
      ];
      
      let zoomLink = null;
      for (const pattern of zoomLinkPatterns) {
        const match = event.description.match(pattern);
        if (match) {
          zoomLink = match[0];
          break;
        }
      }

      // Match various Meeting ID formats
      const meetingIdPatterns = [
        /Meeting ID:[\s]*(\d+[\s-]*\d+[\s-]*\d+)/i,
        /Meeting ID:[\s]*(\d+)/i,
        /zoom\.us\/j\/(\d+)/i,
        /zoomgov\.com\/j\/(\d+)/i
      ];

      let meetingId = null;
      for (const pattern of meetingIdPatterns) {
        const match = event.description.match(pattern);
        if (match) {
          meetingId = match[1].replace(/\s+/g, '');
          break;
        }
      }

      // Match passcode if present
      const passcodeMatch = event.description.match(/Passcode:[\s]*([^\s<>\n]+)/i);
      const passcode = passcodeMatch ? passcodeMatch[1] : null;

      // Check if this is definitely a Zoom meeting
      const isZoomMeeting = zoomLink !== null || 
                         meetingId !== null || 
                         event.description.toLowerCase().includes('zoom meeting') ||
                         event.description.toLowerCase().includes('join zoom');

      return {
        link: zoomLink,
        meetingId: meetingId,
        passcode: passcode,
        isZoomMeeting
      };
    }

    return {
      link: null,
      meetingId: null,
      passcode: null,
      isZoomMeeting: false
    };
  };

  // Function to clean and format description, preserving Zoom information
  const formatDescription = () => {
    if (!event.description) return null;
    
    // Create a temporary element to decode HTML entities
    const decodeHTML = (html: string) => {
      const txt = document.createElement('textarea');
      txt.innerHTML = html;
      return txt.value;
    };
    
    // Remove common Zoom invitation boilerplate
    let cleanText = decodeHTML(event.description)
      .replace(/<[^>]+>/g, '\n') // Replace HTML tags with newlines
      .replace(/\n\s*\n/g, '\n') // Remove multiple consecutive newlines
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .replace(/Join Zoom Meeting\n?/g, '')
      .replace(/Time:([^\n]+)/g, '')
      .replace(/Join from PC, Mac, Linux, iOS or Android:([^\n]+)/g, '')
      .replace(/Password:[^\n]+/g, '')
      .replace(/Meeting ID:[^\n]+/g, '')
      .replace(/Passcode:[^\n]+/g, '')
      .replace(/One tap mobile[^]*?(?=\n\n|\n$|$)/g, '') // Remove one tap mobile section
      .replace(/Dial by your location[^]*?(?=\n\n|\n$|$)/g, '') // Remove dial by location section
      .replace(/Join by SIP[^]*?(?=\n\n|\n$|$)/g, '') // Remove SIP section
      .replace(/Join by H.323[^]*?(?=\n\n|\n$|$)/g, '') // Remove H.323 section
      .replace(/Meeting Link:[^\n]+/g, '')
      .replace(/https:\/\/[\w-]*\.?zoom\.us\/[^\s<>"']+/g, '') // Remove Zoom links
      .replace(/\n\s*\n/g, '\n') // Clean up double newlines again
      .trim();

    return cleanText;
  };

  // Function to get a preview of text (first 50 characters)
  const getPreview = (text: string, maxLength: number = 50) => {
    if (!text) return '';
    const trimmed = text.trim();
    if (trimmed.length <= maxLength) return trimmed;
    return `${trimmed.substring(0, maxLength)}...`;
  };

  // Get the first few participant names for preview
  // Get the first few participant names for preview
const getParticipantsPreview = () => {
  if (!event.attendees || event.attendees.length === 0) return '';
  const firstThree = event.attendees.slice(0, 3);
  // Only split on '@' when present; otherwise fall back to full email
  const names = firstThree
    .map(a => {
      if (a.displayName) {
        return a.displayName;
      }
      if (a.email.includes('@')) {
        return a.email.split('@')[0];
      }
      return a.email;
    })
    .join(', ');
  return event.attendees.length > 3
    ? `${names} and ${event.attendees.length - 3} more`
    : names;
};

  const zoomInfo = extractZoomInfo();
  const cleanDescription = formatDescription();

  // Function to get response status icon/text
  const getResponseStatus = (status?: string) => {
    switch (status) {
      case 'accepted':
        return '✓';
      case 'tentative':
        return '?';
      case 'declined':
        return '✗';
      default:
        return '-';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] md:max-w-[550px] p-6 rounded-lg overflow-hidden">
        {/* Event Title */}
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{event.summary}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Time */}
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="w-full">
              <p className="font-medium">
                {format(startDate, 'EEEE, MMMM d, yyyy')}
              </p>
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>
                  {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                </span>
              </div>
            </div>
          </div>

          {/* Location (if exists) */}
          {event.location && (
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <p className="text-gray-700 break-words w-full">{event.location}</p>
            </div>
          )}

          {/* Participants */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="w-full">
                <button
                  className="w-full flex items-center justify-between text-left py-0.5"
                  onClick={() => setIsParticipantsExpanded(!isParticipantsExpanded)}
                >
                  <span className="text-gray-700">
                    {!isParticipantsExpanded ? getParticipantsPreview() : 'Participants'}
                  </span>
                  {isParticipantsExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                {isParticipantsExpanded && (
                  <div className="mt-2 space-y-1.5">
                    {event.attendees.map((attendee, index) => (
                      <div key={index} className="flex items-center justify-between text-sm pl-0.5">
                        <span className="text-gray-600">{attendee.displayName || attendee.email}</span>
                        <span className="text-gray-400">{getResponseStatus(attendee.responseStatus)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {cleanDescription && cleanDescription.length > 0 && (
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="w-full">
                <button
                  className="w-full flex items-center justify-between text-left py-0.5"
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                >
                  <span className="text-gray-700">
                    {!isDescriptionExpanded ? getPreview(cleanDescription) : 'Description'}
                  </span>
                  {isDescriptionExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                {isDescriptionExpanded && (
                  <div className="mt-2 whitespace-pre-wrap text-sm text-gray-600 pl-0.5">
                    {cleanDescription}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Zoom Meeting Link */}
          {zoomInfo.isZoomMeeting && (
            <div className="flex flex-col space-y-2 bg-blue-50 p-3 rounded-lg mt-auto">
              <div className="flex items-center space-x-3">
                <Video className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <span className="font-medium text-blue-900">Zoom Meeting</span>
              </div>
              {zoomInfo.meetingId && (
                <p className="text-sm text-blue-800 ml-8">Meeting ID: {zoomInfo.meetingId}</p>
              )}
              {zoomInfo.passcode && (
                <p className="text-sm text-blue-800 ml-8">Passcode: {zoomInfo.passcode}</p>
              )}
              {zoomInfo.link && (
                <Button 
                  variant="outline" 
                  className="ml-8 mt-1 w-auto"
                  onClick={() => window.open(zoomInfo.link, '_blank')}
                >
                  <LinkIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  Join Zoom Meeting
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 
