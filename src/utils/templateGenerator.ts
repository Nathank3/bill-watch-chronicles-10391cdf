import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export const generateTemplate = async (committees: string[]) => {
  const types = ['Bill', 'Statement', 'Report', 'Regulation', 'Policy', 'Petition'];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bill Watch Chronicles';
  workbook.lastModifiedBy = 'Bill Watch Chronicles';
  workbook.created = new Date();
  workbook.modified = new Date();

  // 1. Data Entry Sheet
  const sheet = workbook.addWorksheet('Business Data');
  
  // Define columns
  sheet.columns = [
    { header: 'Business Name', key: 'name', width: 40 },
    { header: 'Committee', key: 'committee', width: 40 },
    { header: 'Type of Business', key: 'type', width: 20 },
    { header: 'Date of Committing', key: 'date', width: 25 },
    { header: 'Time Given (Days)', key: 'days', width: 20 },
  ];

  // Style the header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' } // Deep blue
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add sample data
  sheet.addRow({
    name: 'Sample Business Title',
    committee: committees[0] || 'Select Committee',
    type: 'Bill',
    date: format(new Date(), 'dd/MM/yyyy'),
    days: 14
  });

  // 2. Hidden Lookup Sheet for Dropdowns
  const lookupSheet = workbook.addWorksheet('Lookups');
  lookupSheet.state = 'hidden';

  // Add committees to lookup
  committees.forEach((c, i) => {
    lookupSheet.getCell(i + 1, 1).value = c;
  });

  // Add types to lookup
  types.forEach((t, i) => {
    lookupSheet.getCell(i + 1, 2).value = t;
  });

  // Define named ranges for dynamic lists
  const committeeRange = `Lookups!$A$1:$A$${committees.length}`;
  const typesRange = `Lookups!$B$1:$B$${types.length}`;

  // 3. Apply Data Validation Dropdowns (Rows 2 to 500)
  for (let i = 2; i <= 500; i++) {
    const committeeCell = sheet.getCell(`B${i}`);
    committeeCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [committeeRange],
      showErrorMessage: true,
      errorTitle: 'Invalid Committee',
      error: 'Please select a committee from the dropdown list.',
      prompt: 'Select Committee'
    };

    const typeCell = sheet.getCell(`C${i}`);
    typeCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [typesRange],
      showErrorMessage: true,
      errorTitle: 'Invalid Type',
      error: 'Please select a business type from the dropdown list.',
      prompt: 'Select Type'
    };

    const dateCell = sheet.getCell(`D${i}`);
    dateCell.numFmt = 'dd/mm/yyyy';
    dateCell.dataValidation = {
      type: 'date',
      operator: 'greaterThan',
      allowBlank: true,
      formulae: [new Date(2000, 0, 1)],
      showErrorMessage: true,
      errorTitle: 'Invalid Date',
      error: 'Please enter a valid date in DD/MM/YYYY format.',
      prompt: 'Day/Month/Year'
    };
    
    const daysCell = sheet.getCell(`E${i}`);
    daysCell.dataValidation = {
      type: 'whole',
      operator: 'greaterThan',
      allowBlank: true,
      showErrorMessage: true,
      formulae: [0],
      errorTitle: 'Invalid Days',
      error: 'Must be a positive number.'
    };
  }

  // 4. Instructions Sheet
  const instrSheet = workbook.addWorksheet('Instructions');
  instrSheet.columns = [
    { header: 'Field', key: 'field', width: 25 },
    { header: 'Description', key: 'desc', width: 45 },
    { header: 'Notes', key: 'notes', width: 45 },
  ];

  const instrHeader = instrSheet.getRow(1);
  instrHeader.font = { bold: true };
  
  instrSheet.addRows([
    { field: 'Business Name', desc: 'The full title of the bill or document.', notes: 'E.g., The Finance Bill 2024' },
    { field: 'Committee', desc: 'Committee assigned to the item.', notes: 'Use the dropdown menu in the Business Data sheet.' },
    { field: 'Type of Business', desc: 'Classification of the item.', notes: 'Bill, Statement, Report, etc. Use dropdown.' },
    { field: 'Date of Committing', desc: 'Official date the item was committed.', notes: 'Format: DD/MM/YYYY (e.g., 25/12/2024)' },
    { field: 'Time Given (Days)', desc: 'Allocated time period in days.', notes: 'Must be a positive number.' },
  ]);

  instrSheet.addRow({});
  instrSheet.addRow({ field: 'IMPORTANT', desc: 'Do not rename the columns or change their order.', notes: 'The system relies on this structure.' });

  // Generate and Trigger Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Business_Upload_Template_${format(new Date(), 'yyyyMMdd')}.xlsx`);
};
