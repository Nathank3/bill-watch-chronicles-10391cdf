import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client.ts";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { toast } from "@/components/ui/use-toast.ts";

export interface SystemSettings {
  maintenanceMode: boolean;
}

export const useSystemSettings = () => {
  const [settings, setSettings] = useState<SystemSettings>({ maintenanceMode: false });
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    fetchSettings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.maintenance_mode'
        },
        (payload) => {
          if (payload.new && (payload.new as any).value) {
            setSettings({ maintenanceMode: (payload.new as any).value.enabled });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();

      if (error) {
        // If table doesn't exist or row missing, default to false (silent fail)
        // console.error('Error fetching settings:', error);
        return;
      }

      if (data && data.value) {
        // @ts-ignore
        setSettings({ maintenanceMode: data.value.enabled });
      }
    } catch (error) {
      console.error('Error in fetchSettings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMaintenanceMode = async (enabled: boolean) => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only admins can change system settings.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          key: 'maintenance_mode', 
          value: { enabled },
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        });

      if (error) throw error;

      setSettings(prev => ({ ...prev, maintenanceMode: enabled }));
      toast({
        title: enabled ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
        description: enabled 
          ? "Public access is now restricted." 
          : "Public access has been restored."
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update maintenance mode.",
        variant: "destructive"
      });
    }
  };

  return {
    settings,
    loading,
    toggleMaintenanceMode,
    isMaintenanceMode: settings.maintenanceMode
  };
};
