---
description: Steps to perform bulk business uploads and troubleshoot common issues.
---

# Bulk Business Upload Workflow

This workflow guides you through the process of importing multiple legislative
items using the bulk upload feature.

## 📥 Preparing the Data

1. Log in as an **Admin** or **Clerk**.
2. Navigate to the **Clerk Dashboard** or **Admin Dashboard**.
3. Click on the **Bulk Upload** button.
4. Click **Download Template** to get the latest Excel template.
5. Fill the "Business Data" sheet in the Excel file:
   - **Business Name**: Full title of the bill/document.
   - **Committee**: Must match exactly one of the names in the committee list.
   - **Type**: Choose from: Bill, Statement, Report, Regulation, Policy,
     Petition.
   - **Date**: Use `YYYY-MM-DD` format.
   - **Days**: A positive integer (e.g., 14).

## 🚀 Uploading and Validating

1. Click the file input area and select your prepared Excel/CSV file.
2. The system will automatically validate the data.
3. Review the **Validation Results**:
   - **Valid Rows**: Highlighted in green. These are ready for import.
   - **Invalid Rows**: Highlighted in red with a list of errors (e.g., "Invalid
     Committee", "Possible Duplicate").
4. If there are errors, correct them in your spreadsheet and re-upload the file.

## ✅ Finalizing

1. Once satisfied with the results, click **Confirm and Upload [X] Items**.
2. Wait for the success toast message.
3. The uploaded items will appear in the dashboard and their countdown timers
   will begin immediately.

## 🛠 Troubleshooting

- **"Invalid Committee"**: Ensure the committee name matches exactly
  (case-sensitive) as seen in the Committee Management tab.
- **"Invalid Date"**: Ensure the date column in Excel is formatted as a Date or
  a string in `YYYY-MM-DD` format.
- **"Standard XLS vs XLSX"**: Prefer `.xlsx` for better compatibility.
- **Duplicate Error**: The system prevents uploading an item with the same name,
  type, and committee to avoid double-counting.
