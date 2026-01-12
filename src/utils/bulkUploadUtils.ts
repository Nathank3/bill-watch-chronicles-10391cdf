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

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  rowNumber: number;
  data: {
    title: string;
    committee: string;
    type: string;
    dateCommitted: Date;
    pendingDays: number;
  } | null;
}

export const validateBulkData = (
  data: BulkRow[],
  existingBills: Bill[],
  existingDocs: Document[],
  committees: string[]
): ValidationResult[] => {
  const types = ['Bill', 'Statement', 'Report', 'Regulation', 'Policy', 'Petition'];
  const results: ValidationResult[] = [];

  data.forEach((row, index) => {
    const errors: string[] = [];
    const rowNum = index + 2; // Assuming header is line 1

    // Basic required fields
    const name = row['Business Name']?.toString().trim();
    const committee = row['Committee']?.toString().trim();
    const type = row['Type of Business']?.toString().trim();
    const dateCommittedStr = row['Date of Committing'] as string | number;
    const daysStr = row['Time Given (Days)'] as string | number | undefined;
    const dueDateStr = row['Due Date'] as string | number | undefined;

    if (!name) errors.push('Missing Business Name');
    if (!committee) errors.push('Missing Committee');
    if (!type) errors.push('Missing Type of Business');
    if (!dateCommittedStr) errors.push('Missing Date of Committing');

    // Parse Date of Committing
    let dateCommitted: Date | null = null;
    if (dateCommittedStr) {
      dateCommitted = parseExcelDate(dateCommittedStr);
      if (!dateCommitted) {
        errors.push(`Invalid Date of Committing: "${dateCommittedStr}". Use DD/MM/YYYY`);
      }
    }

    // Determine Pending Days
    let days: number = 0;
    
    // Logic: Look for Due Date first, then Days
    if (dueDateStr !== undefined && dueDateStr !== null && dueDateStr !== '') {
        const dueDate = parseExcelDate(dueDateStr);
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
    } else if (daysStr !== undefined && daysStr !== null && daysStr !== '') {
         const d = typeof daysStr === 'number' ? daysStr : parseInt(daysStr);
         if (isNaN(d) || d < 0) { 
             errors.push('Invalid Time Given (Days)');
         } else {
             days = d;
         }
    } else {
        errors.push('Missing either "Due Date" or "Time Given (Days)"');
    }

    // Type validation
    if (type && !types.includes(type)) {
      errors.push(`Invalid Type: "${type}". Must be one of: ${types.join(', ')}`);
    }

    // Committee validation
    if (committee && !committees.includes(committee)) {
      errors.push(`Invalid Committee: "${committee}". Please use names from the dropdown/list.`);
    }

    // Duplicate Check (Name + Type + Committee)
    if (name && type && committee) {
      const isBill = type === 'Bill';
      const duplicateFound = isBill
        ? existingBills.some(b => b.title.toLowerCase() === name.toLowerCase() && b.committee === committee)
        : existingDocs.some(d => d.title.toLowerCase() === name.toLowerCase() && d.type.toLowerCase() === type.toLowerCase() && d.committee === committee);

      if (duplicateFound) {
        errors.push(`Possible Duplicate: A ${type} with this name already exists in this committee.`);
      }
    }

    results.push({
      valid: errors.length === 0,
      errors,
      rowNumber: rowNum,
      data: errors.length === 0 ? {
        title: name,
        committee,
        type: type?.toLowerCase(),
        dateCommitted: dateCommitted as Date,
        pendingDays: days
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
