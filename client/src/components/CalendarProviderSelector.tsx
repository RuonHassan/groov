import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GoogleCalendarButton from './GoogleCalendarButton';
import MicrosoftCalendarButton from './MicrosoftCalendarButton';
import { useCalendar } from '@/contexts/CalendarContext';

export default function CalendarProviderSelector() {
  const [activeTab, setActiveTab] = useState<string>('google');
  const { calendars } = useCalendar();
  
  // Check which providers are connected
  const googleConnected = calendars.some(cal => cal.provider === 'google');
  const microsoftConnected = calendars.some(cal => cal.provider === 'microsoft');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar Integration</CardTitle>
        <CardDescription>
          Connect your calendar to see events alongside your tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="google" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="google">
              Google Calendar
              {googleConnected && <span className="ml-2 text-green-500">✓</span>}
            </TabsTrigger>
            <TabsTrigger value="microsoft">
              Microsoft Outlook
              {microsoftConnected && <span className="ml-2 text-green-500">✓</span>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="google" className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Google Calendar</h3>
                <p className="text-xs text-gray-500">
                  {googleConnected 
                    ? 'Your Google Calendar is connected' 
                    : 'Connect your Google Calendar to see events'}
                </p>
              </div>
              <GoogleCalendarButton />
            </div>
          </TabsContent>
          <TabsContent value="microsoft" className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Microsoft Outlook</h3>
                <p className="text-xs text-gray-500">
                  {microsoftConnected 
                    ? 'Your Microsoft Outlook Calendar is connected' 
                    : 'Connect your Microsoft Outlook Calendar to see events'}
                </p>
              </div>
              <MicrosoftCalendarButton />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

