import { supabase } from "@/integrations/supabase/client.ts";

export interface AuditLogEntry {
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
}

/**
 * Logs an action to the system_audit table.
 * @param entry The audit log entry details
 */
export const logAuditAction = async (entry: AuditLogEntry) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Even if user is null (shouldn't be for audit actions), we try to log
    // deno-lint-ignore no-explicit-any
    const { error } = await supabase.from("system_audit" as any).insert({
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      details: entry.details,
      user_id: user?.id,
      user_email: user?.email
    });

    if (error) {
      console.error("Failed to write to system audit log:", error);
    }
  } catch (err) {
    console.error("Exception writing to system audit log:", err);
  }
};
