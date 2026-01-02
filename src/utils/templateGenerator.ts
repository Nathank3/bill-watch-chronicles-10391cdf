import * as XLSX from 'xlsx';

export const generateTemplate = (committees: string[]) => {
  const headers = ['Business Name', 'Committee', 'Type of Business', 'Date of Committing', 'Time Given (Days)'];
  const types = ['Bill', 'Statement', 'Report', 'Regulation', 'Policy', 'Petition'];
  
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Add an empty row for user input
  const data = [
    headers,
    ['Sample Business', committees[0] || 'Select Committee', 'Bill', new Date().toISOString().split('T')[0], '14']
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(data);

  /* 
    Note: Standard XLSX library for browser doesn't easily support data validation (dropdowns) 
    without extra plugins or writing XML directly. 
    For this "old souls" convenience, we will provide a clear "Instructions" sheet 
    explaining the expected values.
  */

  const instructionsData = [
    ['Field', 'Description', 'Expected Format / Valid Values'],
    ['Business Name', 'The name/title of the business/bill', 'Text'],
    ['Committee', 'The committee handling the business', 'Must match one of the committees listed below'],
    ['Type of Business', 'The type of the item', types.join(', ')],
    ['Date of Committing', 'When it was committed to the committee', 'YYYY-MM-DD (e.g., 2025-12-25)'],
    ['Time Given (Days)', 'Number of days allocated', 'A number (e.g., 14)'],
    ['', '', ''],
    ['VALID COMMITTEES', '', ''],
    ...committees.map(c => [c, '', ''])
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);

  XLSX.utils.book_append_sheet(wb, ws, 'Business Data');
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  // Generate buffer and trigger download
  XLSX.writeFile(wb, 'Business_Upload_Template.xlsx');
};
