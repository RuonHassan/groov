import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ui/color-picker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SettingsPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsPopup({ open, onOpenChange }: SettingsPopupProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [defaultTaskColor, setDefaultTaskColor] = useState("#6C584C");
  const [defaultGcalColor, setDefaultGcalColor] = useState("#B1C29E");
  const [externalMeetingColor, setExternalMeetingColor] = useState("#F4A261");
  const [tempTaskColor, setTempTaskColor] = useState("#6C584C");
  const [tempGcalColor, setTempGcalColor] = useState("#B1C29E");
  const [tempExternalMeetingColor, setTempExternalMeetingColor] = useState("#F4A261");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('default_task_color, default_gcal_color, external_meeting_color')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          const taskColor = data.default_task_color || "#6C584C";
          const gcalColor = data.default_gcal_color || "#B1C29E";
          const extColor = data.external_meeting_color || "#F4A261";
          setDefaultTaskColor(taskColor);
          setDefaultGcalColor(gcalColor);
          setExternalMeetingColor(extColor);
          setTempTaskColor(taskColor);
          setTempGcalColor(gcalColor);
          setTempExternalMeetingColor(extColor);
        }
      } catch (error) {
        console.error('Error fetching user settings:', error);
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchUserSettings();
    }
  }, [user?.id, open]);

  useEffect(() => {
    // Check if there are any unsaved changes
    const hasUnsavedChanges = 
      tempTaskColor !== defaultTaskColor || 
      tempGcalColor !== defaultGcalColor ||
      tempExternalMeetingColor !== externalMeetingColor;
    setHasChanges(hasUnsavedChanges);
  }, [tempTaskColor, tempGcalColor, tempExternalMeetingColor, defaultTaskColor, defaultGcalColor, externalMeetingColor]);

  const saveSettings = async () => {
    if (!user?.id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          default_task_color: tempTaskColor,
          default_gcal_color: tempGcalColor,
          external_meeting_color: tempExternalMeetingColor
        })
        .eq('id', user.id);

      if (error) throw error;

      setDefaultTaskColor(tempTaskColor);
      setDefaultGcalColor(tempGcalColor);
      setExternalMeetingColor(tempExternalMeetingColor);
      setHasChanges(false);

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!user?.id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          default_task_color: null,
          default_gcal_color: null,
          external_meeting_color: null
        })
        .eq('id', user.id);

      if (error) throw error;

      // Reset to application defaults
      setDefaultTaskColor("#6C584C");
      setDefaultGcalColor("#B1C29E");
      setExternalMeetingColor("#F4A261");
      setTempTaskColor("#6C584C");
      setTempGcalColor("#B1C29E");
      setTempExternalMeetingColor("#F4A261");
      setHasChanges(false);

      toast({
        title: "Success",
        description: "Settings reset to defaults",
      });
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast({
        title: "Error",
        description: "Failed to reset settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTaskColorChange = (color: string) => {
    setTempTaskColor(color);
  };

  const handleGcalColorChange = (color: string) => {
    setTempGcalColor(color);
  };

  const handleExternalMeetingColorChange = (color: string) => {
    setTempExternalMeetingColor(color);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="p-4 text-center">Loading settings...</div>
        ) : (
          <>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Default Task Color</Label>
                <ColorPicker value={tempTaskColor} onChange={handleTaskColorChange} />
              </div>

              <div className="space-y-2">
                <Label>Default Calendar Event Color</Label>
                <ColorPicker value={tempGcalColor} onChange={handleGcalColorChange} />
              </div>

              <div className="space-y-2">
                <Label>External Meeting Color</Label>
                <ColorPicker value={tempExternalMeetingColor} onChange={handleExternalMeetingColorChange} />
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={resetToDefaults}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset to Defaults'
                )}
              </Button>
              <Button
                onClick={saveSettings}
                disabled={!hasChanges || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
} 