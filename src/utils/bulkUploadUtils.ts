import { Bill } from "@/contexts/BillContext.tsx";
import { Document } from "@/contexts/DocumentContext.tsx";

export interface BulkRow {
  'Business Name': string;
  'Committee': string;
  'Type of Business': string;
  'Date of Committing': string | number;
  'Time Given (Days)': string | number;
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
    const dateStr = row['Date of Committing'] as string | number;
    const daysStr = row['Time Given (Days)'] as string | number;
    const days = typeof daysStr === 'number' ? daysStr : parseInt(daysStr);

    if (!name) errors.push('Missing Business Name');
    if (!committee) errors.push('Missing Committee');
    if (!type) errors.push('Missing Type of Business');
    if (!dateStr) errors.push('Missing Date of Committing');
    if (isNaN(days) || days <= 0) errors.push('Invalid Time Given (Days)');

    // Type validation
    if (type && !types.includes(type)) {
      errors.push(`Invalid Type: "${type}". Must be one of: ${types.join(', ')}`);
    }

    // Committee validation
    if (committee && !committees.includes(committee)) {
      errors.push(`Invalid Committee: "${committee}". Please use names from the dropdown/list.`);
    }

    // Date validation
    let finalDate: Date | null = null;
    if (dateStr) {
      // Excel might store dates as numbers
      if (typeof dateStr === 'number') {
        const date = new Date((dateStr - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
          finalDate = date;
        } else {
          errors.push('Invalid Date format (numeric)');
        }
      } else {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          finalDate = date;
        } else {
          errors.push('Invalid Date format (text). Use YYYY-MM-DD');
        }
      }
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
        dateCommitted: finalDate as Date,
        pendingDays: days
      } : null
    });
  });

  return results;
};
