
import { Bill } from "@/contexts/BillContext.tsx";
import { Document } from "@/contexts/DocumentContext.tsx";
import { BulkRow, ValidationResult } from "./bulkUploadUtils.ts"; // Re-use types if exported, or redefine

// We need to re-declare or import detectTypeFromTitle and parseExcelDate since they are not exported from bulkUploadUtils.ts
// To mimic "copy-paste" behavior for safety, I'll duplicate the helpers here or export them from original file.
// For safety and reduced coupling (as requested), I will duplicate the necessary small helpers here.

const detectTypeFromTitle = (title: string): string | null => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("statement")) return "Statement";
  if (lowerTitle.includes("motion")) return "Motion";
  if (lowerTitle.includes("petition")) return "Petition";
  if (lowerTitle.includes("policy")) return "Policy";
  if (lowerTitle.includes("regulation")) return "Regulation";
  if (lowerTitle.includes("report")) return "Report";
  if (lowerTitle.includes("bill")) return "Bill";
  return null;
};

// Helper: Parse Excel Date (Number or String)
const parseExcelDate = (val: string | number): Date | null => {
  if (typeof val === 'number') {
    // Excel date number
    const date = new Date((val - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  } else if (typeof val === 'string') {
    // Try DD/MM/YYYY
    const parts = val.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; 
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return isNaN(date.getTime()) ? null : date;
    }
    // Try ISO/Other
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

export const validateConcludedMigrationData = (
  data: BulkRow[],
  existingBills: Bill[],
  existingDocs: Document[],
  committees: string[]
): ValidationResult[] => {
  const types = ['Bill', 'Statement', 'Report', 'Regulation', 'Policy', 'Petition', 'Motion'];
  const results: ValidationResult[] = [];

  data.forEach((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const rowNum = index + 2; // Assuming header is line 1

    // Helper to find key case-insensitive/trimmed
    const findKey = (search: string) => Object.keys(row).find(k => k.trim().toLowerCase() === search.toLowerCase());

    const nameKey = findKey('Business Name') || findKey('Title');
    const committeeKey = findKey('Committee') || findKey('Committee Name');
    const typeKey = findKey('Type of Business') || findKey('Type');
    
    // Concluded Specific Keys
    const sittingDateKey = findKey('Sitting Date'); // "Due Date" equivalent
    const approvedDateKey = findKey('Approved Date'); // "Concluded Date" equivalent
    const dateKey = findKey('Date of Committing'); // Optional for historical data

    // Values
    const name = nameKey ? row[nameKey as keyof typeof row]?.toString().trim() : undefined;
    const committee = committeeKey ? row[committeeKey as keyof typeof row]?.toString().trim() : undefined;
    let type = typeKey ? row[typeKey as keyof typeof row]?.toString().trim() : undefined;
    
    // Dates
    const sittingDateStr = sittingDateKey ? row[sittingDateKey as keyof typeof row] as string | number | undefined : undefined;
    const approvedDateStr = approvedDateKey ? row[approvedDateKey as keyof typeof row] as string | number | undefined : undefined;
    const dateCommittedStr = dateKey ? row[dateKey as keyof typeof row] as string | number : undefined;

    // Checks
    if (!name) errors.push('Missing Business Name');
    if (!committee) errors.push('Missing Committee');

    // Auto-detect type
    let finalType = type;
    if (finalType) {
        const matchedType = types.find(t => t.toLowerCase() === finalType!.toLowerCase());
        if (matchedType) finalType = matchedType;
    }
    if (name) {
        const detectedType = detectTypeFromTitle(name);
        if (detectedType) {
             if (!finalType || (finalType === 'Bill' && detectedType !== 'Bill')) {
                 finalType = detectedType;
             }
        }
    }
    type = finalType;
    if (!type) errors.push('Missing Type (could not infer from content)');

    // Parse Dates
    let concludedAt: Date | null = null;
    let presentationDate: Date | null = null;
    let dateCommitted: Date | null = null;

    // 1. Approved Date (Concluded At) - MANDATORY for this tool
    if (approvedDateStr) {
        concludedAt = parseExcelDate(approvedDateStr);
        if (!concludedAt) {
            errors.push(`Invalid 'Approved Date': "${approvedDateStr}". Use DD/MM/YYYY`);
        }
    } else {
        errors.push("Missing 'Approved Date'. This tool requires an Approved Date for concluded items.");
    }

    // 2. Sitting Date (Due Date / Presentation Date) - Optional but good to have
    if (sittingDateStr) {
        presentationDate = parseExcelDate(sittingDateStr);
        if (!presentationDate) {
            warnings.push(`Invalid 'Sitting Date': "${sittingDateStr}". Ignored.`);
        }
    }

    // 3. Date Committed - Optional for historical/concluded
    if (dateCommittedStr) {
        dateCommitted = parseExcelDate(dateCommittedStr);
        if (!dateCommitted) {
            warnings.push(`Invalid 'Date of Committing': "${dateCommittedStr}". Ignored.`);
        }
    }

    if (concludedAt && presentationDate) {
        // Sanity check: Concluded after Sitting? Not necessarily, but usually.
        // We won't enforce logic here as historical data is messy.
    }

    // Committee Validation with Fuzzy Match
    let finalCommittee = committee;
    if (committee && committee !== "All Committees") {
       if (committees.includes(committee)) {
           finalCommittee = committee;
       } else {
           const sortedCommittees = [...committees].sort((a, b) => b.length - a.length);
           const match = sortedCommittees.find(c => 
               committee.toLowerCase().includes(c.toLowerCase()) || 
               c.toLowerCase().includes(committee.toLowerCase())
           );

           if (match) {
               finalCommittee = match;
               warnings.push(`Committee fuzzy matched: "${committee}" -> "${match}"`);
           } else {
               errors.push(`Invalid Committee: "${committee}".`);
           }
       }
    }

    // Duplicate Check - Warn only
    if (name && finalType && finalCommittee) {
      const isBill = finalType === 'Bill';
      const duplicateFound = isBill
        ? existingBills.some(b => b.title.toLowerCase() === name.toLowerCase() && b.committee === finalCommittee)
        : existingDocs.some(d => d.title.toLowerCase() === name.toLowerCase() && d.type.toLowerCase() === finalType?.toLowerCase() && d.committee === finalCommittee);

      if (duplicateFound) {
        warnings.push(`Duplicate: Item already exists. Will create anyway.`);
      }
    }

    results.push({
      valid: errors.length === 0,
      errors,
      warnings,
      rowNumber: rowNum,
      data: errors.length === 0 ? {
        title: name,
        committee: finalCommittee,
        type: finalType?.toLowerCase(),
        dateCommitted: dateCommitted,
        pendingDays: 0, // Not relevant for concluded
        presentationDate: presentationDate,
        status: 'concluded', // Always concluded
        concludedAt: concludedAt
      } : null
    });
  });

  return results;
};
