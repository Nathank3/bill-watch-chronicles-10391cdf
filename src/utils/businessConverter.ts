import { supabase } from "@/integrations/supabase/client.ts";
import { logAuditAction } from "@/utils/auditLogger.ts";
import { DocumentType } from "@/types/document.ts";

interface BusinessItemData {
  id: string;
  title: string;
  committee: string;
  dateCommitted: Date;
  status: string;
  type: "bill" | DocumentType;
  pendingDays: number;
  presentationDate: Date;
  daysAllocated: number;
  extensionsCount: number;
}

/**
 * Converts a business item from one type to another. 
 * If converting between 'bill' and document types, it moves the record to the appropriate table.
 */
export const convertBusinessItem = async (
  item: BusinessItemData,
  newType: "bill" | DocumentType,
  newData: { 
    title?: string; 
    committee?: string; 
    dateCommitted?: Date; 
    status?: string; 
    statusReason?: string;
    pendingDays?: number;
    presentationDate?: Date;
    extensionsCount?: number;
  }
) => {
  const currentType = item.type;
  const targetType = newType;
  
  // Prepare new data merging existing with updates
  const finalData = {
    title: newData.title || item.title,
    committee: newData.committee || item.committee,
    status: newData.status || item.status,
    // Use ISO strings for DB
    date_committed: (newData.dateCommitted || item.dateCommitted)?.toISOString() || null,
    presentation_date: (newData.presentationDate || item.presentationDate)?.toISOString() || null, 
    pending_days: newData.pendingDays !== undefined ? newData.pendingDays : item.pendingDays,
    days_allocated: newData.pendingDays !== undefined ? newData.pendingDays : item.daysAllocated, // Assuming allocated tracks total current pending days
    extensions_count: newData.extensionsCount !== undefined ? newData.extensionsCount : item.extensionsCount,
    updated_at: new Date().toISOString(),
    status_reason: newData.statusReason // Include status reason
  };

  // 1. Simple Update (Same Table)
  // If moving from Bill -> Bill (just update) OR Document -> Document (just update type column)
  if ((currentType === "bill" && targetType === "bill") || (currentType !== "bill" && targetType !== "bill")) {
    const table = currentType === "bill" ? "bills" : "documents";
    // deno-lint-ignore no-explicit-any
    const updatePayload: any = { ...finalData };
    
    if (currentType !== "bill") {
        updatePayload.type = targetType; // Update type column for documents
    }

    // deno-lint-ignore no-explicit-any
    const { error } = await supabase.from(table as any).update(updatePayload).eq("id", item.id);
    if (error) throw error;

    await logAuditAction({
      action: "UPDATE_BUSINESS_DETAILS",
      entity_type: targetType,
      entity_id: item.id,
      details: { oldType: currentType, newType: targetType, changes: newData }
    });

    return { success: true, newId: item.id };
  }

  // 2. Cross-Table Migration (Bill <-> Document)
  // We must CREATE in new table and DELETE from old table
  const sourceTable = currentType === "bill" ? "bills" : "documents";
  const targetTable = targetType === "bill" ? "bills" : "documents";

  // Get current user for 'created_by'
  const { data: { user } } = await supabase.auth.getUser();

  // deno-lint-ignore no-explicit-any
  const insertPayload: any = {
    ...finalData,
    created_by: user?.id, 
    created_at: new Date().toISOString(), // Reset created_at or keep? Usually reset for new record context, but maybe keep? Let's use new.
  };

  if (targetType !== "bill") {
    insertPayload.type = targetType;
  }

  // Perform Transaction-like operation
  // A. Insert into new table
  // deno-lint-ignore no-explicit-any
  const { data: inserted, error: insertError } = await supabase.from(targetTable as any).insert(insertPayload).select().single();
  
  if (insertError) throw insertError;

  // Fix: inserted is potentially null if select() fails, but single() usually throws.
  // We cast inserted to any to access id safely in this context or use generic type if available
  // deno-lint-ignore no-explicit-any
  const newId = (inserted as any).id;

  // B. Delete from old table
  // deno-lint-ignore no-explicit-any
  const { error: deleteError } = await supabase.from(sourceTable as any).delete().eq("id", item.id);

  if (deleteError) {
    console.error("CRITICAL: Failed to delete old record during conversion", deleteError);
    // Attempt rollback (delete new record)
    // deno-lint-ignore no-explicit-any
    await supabase.from(targetTable as any).delete().eq("id", newId);
    throw new Error("Conversion failed during cleanup. Rolled back.");
  }

  await logAuditAction({
    action: "CONVERT_BUSINESS_TYPE",
    entity_type: targetType,
    entity_id: newId,
    details: { 
      fromId: item.id,
      fromType: currentType, 
      toType: targetType,
      reason: "Admin conversion"
    }
  });

  return { success: true, newId };
};
