
import { supabase } from "@/integrations/supabase/client.ts";
import { BillStatus } from "@/contexts/BillContext.tsx";
import { DocumentStatus } from "@/types/document.ts";

/**
 * Utility to bulk correct statuses based on dates.
 * This ensures the database 'status' column matches the implicit status derived from presentation_date.
 */
export const correctStatuses = async () => {
    const results = {
        billsUpdated: 0,
        docsUpdated: 0,
        errors: [] as string[]
    };

    const now = new Date();

    try {
        // 1. Correct Bills
        const { data: bills, error: billsError } = await supabase
            .from("bills")
            .select("id, status, presentation_date, extensions_count");

        if (billsError) throw billsError;

        if (bills) {
            for (const bill of bills) {
                let newStatus: BillStatus | null = null;
                const status = bill.status as string;
                const presDate = bill.presentation_date ? new Date(bill.presentation_date) : null;

                // Check for Overdue
                // Logic: If pending/under_review AND (date < now OR extensions > 0)
                if ((status === "pending" || status === "under_review") && presDate) {
                    if (presDate < now || (bill.extensions_count > 0)) {
                        newStatus = "overdue";
                    }
                }

                // Check for TBD
                // Logic: If pending AND no date
                if (status === "pending" && !presDate) {
                    newStatus = "tbd";
                }

                if (newStatus && newStatus !== status) {
                    const { error } = await supabase
                        .from("bills")
                        .update({ status: newStatus, updated_at: new Date().toISOString() })
                        .eq("id", bill.id);
                    
                    if (error) results.errors.push(`Bill ${bill.id}: ${error.message}`);
                    else results.billsUpdated++;
                }
            }
        }

        // 2. Correct Documents
        const { data: docs, error: docsError } = await supabase
            .from("documents")
            .select("id, status, presentation_date, extensions_count");

        if (docsError) throw docsError;

        if (docs) {
            for (const doc of docs) {
                let newStatus: DocumentStatus | null = null;
                const status = doc.status as string;
                const presDate = doc.presentation_date ? new Date(doc.presentation_date) : null;

                // Check for Overdue
                if ((status === "pending" || status === "under_review") && presDate) {
                    if (presDate < now || (doc.extensions_count && doc.extensions_count > 0)) {
                        newStatus = "overdue";
                    }
                }

                // Check for TBD
                if (status === "pending" && !presDate) {
                    newStatus = "tbd";
                }

                if (newStatus && newStatus !== status) {
                    const { error } = await supabase
                        .from("documents")
                        .update({ status: newStatus, updated_at: new Date().toISOString() })
                        .eq("id", doc.id);

                    if (error) results.errors.push(`Doc ${doc.id}: ${error.message}`);
                    else results.docsUpdated++;
                }
            }
        }

    } catch (e) {
        console.error("Status correction failed", e);
        throw e;
    }

    return results;
};
