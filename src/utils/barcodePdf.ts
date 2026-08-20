import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import type { Material } from '../types';

export interface BarcodePdfOptions {
  format: 'CODE128' | 'QR';
  columns: number;
  rows: number;
  pageSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  showName: boolean;
  showSku: boolean;
  showPrice: boolean;
  showCategory: boolean;
  showCompany: boolean;
  companyName?: string;
  copiesPerItem?: number;
}

/**
 * Captures rendered multi-page sheet preview elements and compiles them into a clean multi-page PDF document.
 */
export async function exportBarcodeSheetsToPdf(
  sheetElements: HTMLElement[],
  filename: string = 'Material_Barcodes_MultiPage.pdf',
  pageSize: 'a4' | 'letter' = 'a4',
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<void> {
  if (!sheetElements || sheetElements.length === 0) {
    throw new Error('No barcode sheets found to export.');
  }

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < sheetElements.length; i++) {
    const sheetEl = sheetElements[i];
    
    // Using html-to-image to bypass modern CSS color parse errors (like oklab)
    const imgData = await toPng(sheetEl, {
      pixelRatio: 2, // High resolution capture
      backgroundColor: '#ffffff',
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left'
      }
    });

    if (i > 0) {
      pdf.addPage(pageSize, orientation);
    }

    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
  }

  pdf.save(filename);
}

/**
 * Splits items into sheets based on columns x rows grid
 */
export function chunkItemsIntoSheets<T>(items: T[], itemsPerPage: number): T[][] {
  const sheets: T[][] = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    sheets.push(items.slice(i, i + itemsPerPage));
  }
  return sheets;
}
