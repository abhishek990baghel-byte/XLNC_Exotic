import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToPdf(data: any[], filename: string, title: string) {
  if (!data || data.length === 0) return;

  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

  // Get headers from first object
  const headers = Object.keys(data[0]).filter(k => k !== 'id' && !k.endsWith('_id'));
  
  const formattedHeaders = headers.map(h => 
    h.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  );

  const rows = data.map(item => {
    return headers.map(header => {
      let val = item[header];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') {
        if (val instanceof Date) {
          return val.toLocaleString();
        }
        return JSON.stringify(val);
      }
      return String(val);
    });
  });

  autoTable(doc, {
    head: [formattedHeaders],
    body: rows,
    startY: 40,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(`${filename}.pdf`);
}
