import { Bill } from "@/contexts/BillContext.tsx";
import { Document } from "@/contexts/DocumentContext.tsx";



export interface BulkRow {
  'Business Name': string;
  'Committee': string;
  'Type of Business': string;
  'Date of Committing': string | number;
  'Time Given (Days)'?: string | number;
  'Due Date'?: string | number;
}

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

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  rowNumber: number;
  data: {
    title: string;
    committee: string;
    type: string;
    dateCommitted: Date | null;
    pendingDays: number;
    presentationDate?: Date | null;
    status: 'pending' | 'limbo';
  } | null;
}

// ... (omitting lines between interface and push for brevity, tool will not replace them unless targeted)



export const validateBulkData = (
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

    // Basic required fields
    // Helper to find key case-insensitive/trimmed
    const findKey = (search: string) => Object.keys(row).find(k => k.trim().toLowerCase() === search.toLowerCase());

    const nameKey = findKey('Business Name');
    const committeeKey = findKey('Committee');
    const typeKey = findKey('Type of Business');
    const dateKey = findKey('Date of Committing');
    const daysKey = findKey('Time Given (Days)');
    const dueDateKey = findKey('Due Date');

    // Basic required fields
    const name = nameKey ? row[nameKey as keyof typeof row]?.toString().trim() : undefined;
    const committee = committeeKey ? row[committeeKey as keyof typeof row]?.toString().trim() : undefined;
    let type = typeKey ? row[typeKey as keyof typeof row]?.toString().trim() : undefined;
    const dateCommittedStr = dateKey ? row[dateKey as keyof typeof row] as string | number : undefined;
    const daysStr = daysKey ? row[daysKey as keyof typeof row] as string | number | undefined : undefined;
    const dueDateStr = dueDateKey ? row[dueDateKey as keyof typeof row] as string | number | undefined : undefined;

    if (!name) errors.push('Missing Business Name');
    if (!committee) errors.push('Missing Committee');
    
    // Auto-detect type if missing or if it looks generic ("Bill") but content suggests otherwise
    let finalType = type;
    
    // Normalize explicit type if present
    if (finalType) {
        // Match against valid types (case-insensitive)
        const matchedType = types.find(t => t.toLowerCase() === finalType!.toLowerCase());
        if (matchedType) {
            finalType = matchedType; // Use standard casing (e.g. "Statement")
        }
    }

    if (name) {
        const detectedType = detectTypeFromTitle(name);
        if (detectedType) {
            // If explicit type is missing OR explicit type is "Bill" but detected is something else (e.g. Statement), override
             if (!finalType || (finalType === 'Bill' && detectedType !== 'Bill')) {
                 finalType = detectedType;
             }
        }
    }
    
    // Update the var to be used downstream
    type = finalType;

    if (!type) errors.push('Missing Type of Business (and could not infer from content)');
    // REMOVED: if (!dateCommittedStr) errors.push('Missing Date of Committing'); (Handled in logic below)

    // Parse Date of Committing
    let dateCommitted: Date | null = null;
    if (dateCommittedStr) {
      dateCommitted = parseExcelDate(dateCommittedStr);
      if (!dateCommitted) {
        errors.push(`Invalid Date of Committing: "${dateCommittedStr}". Use DD/MM/YYYY`);
      }
    }

    // Determine Pending Days & Due Date
    let days: number = 0;
    let hasDueDate = false;
    let hasDaysGiven = false;

    // Check availability of Due Date columns
    if (dueDateStr !== undefined && dueDateStr !== null && dueDateStr !== '') {
        hasDueDate = true;
    }
    if (daysStr !== undefined && daysStr !== null && daysStr !== '') {
        hasDaysGiven = true;
    }

    // --- Data Integrity & Limbo Logic ---
    const hasCommittedDate = !!dateCommitted;
    const hasDeadline = hasDueDate || hasDaysGiven;
    let isLimbo = false;

    if (!hasCommittedDate && !hasDeadline) {
        // Scenario A: Limbo (No dates at all)
        isLimbo = true;
        warnings.push("Limbo State: No dates provided. Item will be uploaded as 'Limbo'.");
    } else if (hasCommittedDate && hasDeadline) {
        // Scenario B: Active (Both dates exist)
        // Proceed to calculate days/validate dates
        
        if (hasDueDate) {
             const dueDate = parseExcelDate(dueDateStr!);
             if (dueDate) {
                 if (dateCommitted) {
                      const diffTime = dueDate.getTime() - dateCommitted.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) {
                          errors.push(`Due Date cannot be before Date of Committing.`);
                      } else {
                          days = diffDays;
                      }
                 }
             } else {
                 errors.push(`Invalid Due Date: "${dueDateStr}". Use DD/MM/YYYY`);
             }
        } else {
             // specific days given
             const d = typeof daysStr === 'number' ? daysStr : parseInt(daysStr as string);
             if (isNaN(d) || d < 0) { 
                 errors.push('Invalid Time Given (Days)');
             } else {
                 days = d;
             }
        }

    } else {
        // Scenario C: Half-Baked (Partial Data = Limbo)
        // Instead of rejecting, we classify these as Limbo because they are incomplete but likely valid records
        isLimbo = true;
        if (hasCommittedDate && !hasDeadline) {
             warnings.push('Incomplete: "Date of Committing" provided but missing deadline. Item set to Limbo.');
        } else if (!hasCommittedDate && hasDeadline) {
             warnings.push('Incomplete: Deadline provided but missing "Date of Committing". Item set to Limbo.');
        }
    }

    // Type validation
    if (type && !types.includes(type)) {
      errors.push(`Invalid Type: "${type}". Must be one of: ${types.join(', ')}`);
    }

    // Committee validation & Fuzzy Matching
    let finalCommittee = committee;
    if (committee && committee !== "All Committees") {
       // Exact match
       if (committees.includes(committee)) {
           finalCommittee = committee;
       } else {
           // Fuzzy match: Check if any known committee is "contained" in the input or vice versa
           // e.g. Input: "Health Committee", Known: "Health" -> Match
           // e.g. Input: "Budget", Known: "Budget and Appropriations" -> Partial match? Maybe risky.
           // Let's stick to "Known committee name is substring of Input" or "Input is substring of Known".
           // Better: "Input includes Known Name" (e.g. "Committee on Health" includes "Health")
           
           // Sort committees by length descending to match specific ones first ("Health and Sanitation" vs "Health")
           const sortedCommittees = [...committees].sort((a, b) => b.length - a.length);
           
           const match = sortedCommittees.find(c => 
               committee.toLowerCase().includes(c.toLowerCase()) || 
               c.toLowerCase().includes(committee.toLowerCase())
           );

           if (match) {
               finalCommittee = match;
               warnings.push(`Committee fuzzy matched: "${committee}" -> "${match}"`);
           } else {
               errors.push(`Invalid Committee: "${committee}". Expected one of: ${committees.slice(0, 3).join(', ')}...`);
           }
       }
    } else if (!committee) {
        // Already handled by 'Missing Committee' check above but good to be safe
    } else {
        // "All Committees" is presumably not valid for a specific item, or is it? 
        // Assuming individual items must belong to a specific committee.
        // If "All Committees" is passed, maybe default to user's committee or error?
        // For now, treat as invalid if it's strictly "All Committees" generic bucket
        if (committee === "All Committees") {
             errors.push(`Invalid Committee: "All Committees". Please specify a specific committee.`);
        }
    }
    
    // Duplicate Check (Name + Type + Committee)
    if (name && finalType && finalCommittee) {
      const isBill = finalType === 'Bill';
      const duplicateFound = isBill
        ? existingBills.some(b => b.title.toLowerCase() === name.toLowerCase() && b.committee === finalCommittee)
        : existingDocs.some(d => d.title.toLowerCase() === name.toLowerCase() && d.type.toLowerCase() === finalType?.toLowerCase() && d.committee === finalCommittee);

      if (duplicateFound) {
        errors.push(`Possible Duplicate: A ${finalType} with this name already exists in this committee.`);
      }
    }

    results.push({
      valid: errors.length === 0,
      errors,
      warnings, // Add warnings to result
      rowNumber: rowNum,
      data: errors.length === 0 ? {
        title: name,
        committee: finalCommittee,
        type: finalType?.toLowerCase(),
        dateCommitted: isLimbo ? null : (dateCommitted as Date),
        pendingDays: isLimbo ? 0 : days,
        presentationDate: (hasDueDate && dueDateStr) ? parseExcelDate(dueDateStr) : null,
        status: isLimbo ? 'limbo' : 'pending'
      } : null
    });
  });

  return results;
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
