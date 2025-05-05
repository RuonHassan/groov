import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ui/color-picker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [defaultTaskColor, setDefaultTaskColor] = useState("#6C584C");
  const [defaultGcalColor, setDefaultGcalColor] = useState("#B1C29E");
  const [tempTaskColor, setTempTaskColor] = useState("#6C584C");
  const [tempGcalColor, setTempGcalColor] = useState("#B1C29E");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('default_task_color, default_gcal_color')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          const taskColor = data.default_task_color || "#6C584C";
          const gcalColor = data.default_gcal_color || "#B1C29E";
          setDefaultTaskColor(taskColor);
          setDefaultGcalColor(gcalColor);
          setTempTaskColor(taskColor);
          setTempGcalColor(gcalColor);
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

    fetchUserSettings();
  }, [user?.id]);

  useEffect(() => {
    // Check if there are any unsaved changes
    const hasUnsavedChanges = 
      tempTaskColor !== defaultTaskColor || 
      tempGcalColor !== defaultGcalColor;
    setHasChanges(hasUnsavedChanges);
  }, [tempTaskColor, tempGcalColor, defaultTaskColor, defaultGcalColor]);

  const saveSettings = async () => {
    if (!user?.id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          default_task_color: tempTaskColor,
          default_gcal_color: tempGcalColor
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setDefaultTaskColor(tempTaskColor);
      setDefaultGcalColor(tempGcalColor);
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
          default_gcal_color: null
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Reset to application defaults
      setDefaultTaskColor("#6C584C");
      setDefaultGcalColor("#B1C29E");
      setTempTaskColor("#6C584C");
      setTempGcalColor("#B1C29E");
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

  if (loading) {
    return <div className="p-4">Loading settings...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Default Colors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Default Task Color</Label>
            <ColorPicker value={tempTaskColor} onChange={handleTaskColorChange} />
            
          </div>

          <div className="space-y-2">
            <Label>Default Google Calendar Event Color</Label>
            <ColorPicker value={tempGcalColor} onChange={handleGcalColorChange} />
           
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
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
        </CardFooter>
      </Card>
    </div>
  );
} 