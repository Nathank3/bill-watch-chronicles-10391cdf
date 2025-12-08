
import { format } from "date-fns";
import jsPDF from "jspdf";

/**
 * Format date with day abbreviation before numerical date
 * Example: "Mon 8/12/2025"
 */
export const formatDateWithDay = (date: Date): string => {
  const dayAbbr = format(date, "EEE"); // Mon, Tue, Wed, etc.
  const dateStr = format(date, "d/M/yyyy");
  return `${dayAbbr} ${dateStr}`;
};

/**
 * Load and add header image to PDF document
 * Returns the height of the image added
 * Note: The header image should be saved in the public folder
 */
export const addHeaderImage = async (doc: jsPDF, imagePath: string): Promise<number> => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        try {
          const pageWidth = doc.internal.pageSize.getWidth();
          
          // Calculate dimensions - maintain aspect ratio, fit to page width with margins
          const marginLeft = 15; // Bleed space for punching holes
          const marginRight = 15;
          const availableWidth = pageWidth - marginLeft - marginRight;
          const aspectRatio = img.height / img.width;
          const imgWidth = availableWidth;
          const imgHeight = imgWidth * aspectRatio;
          
          // Limit header height to reasonable size (max 40mm)
          const maxHeight = 40;
          let finalHeight = imgHeight;
          let finalWidth = imgWidth;
          
          if (imgHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = finalHeight / aspectRatio;
          }
          
          // Add image at top with margins, centered
          const imgX = marginLeft + (availableWidth - finalWidth) / 2;
          doc.addImage(img, 'PNG', imgX, 5, finalWidth, finalHeight);
          
          resolve(finalHeight); // Return height only (spacing handled separately)
        } catch (error) {
          console.error("Error adding image to PDF:", error);
          resolve(0); // Return 0 if image fails, continue without it
        }
      };
      
      img.onerror = () => {
        console.warn("Could not load header image, continuing without it");
        resolve(0); // Return 0 if image fails to load
      };
      
      // Use absolute path for public assets
      const fullPath = window.location.origin + imagePath;
      img.src = fullPath;
    } catch (error) {
      console.error("Error setting up image load:", error);
      resolve(0);
    }
  });
};

/**
 * Draw a double line divider (black and green) under the header
 */
export const drawDivider = (doc: jsPDF, yPosition: number, leftMargin: number, rightMargin: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const lineWidth = pageWidth - leftMargin - rightMargin;
  const lineX = leftMargin;
  
  // Draw black line (thicker)
  doc.setDrawColor(0, 0, 0); // Black
  doc.setLineWidth(0.5);
  doc.line(lineX, yPosition, lineX + lineWidth, yPosition);
  
  // Draw green line below black line (2mm spacing)
  doc.setDrawColor(0, 128, 0); // Green
  doc.setLineWidth(0.3);
  doc.line(lineX, yPosition + 2, lineX + lineWidth, yPosition + 2);
  
  // Return the position after both lines
  return yPosition + 2 + 2; // 2mm for green line + 2mm spacing
};

