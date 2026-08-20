import toast from "react-hot-toast";
import jsPDF from 'jspdf';
import type { Settings } from '../types';

export const emailInvoice = async (saleId: string, settings: Partial<Settings> | null) => {
  try {
    const res = await fetch(`/api/sales/${saleId}`);
    if (!res.ok) throw new Error('Failed to fetch sale details');
    const fullSale = await res.json();
    
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(settings?.business_name || 'Invoice', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Invoice Number: ${fullSale.invoice_number}`, 14, 35);
    doc.text(`Date: ${new Date(fullSale.date).toLocaleDateString()}`, 14, 42);
    doc.text(`Customer Name: ${fullSale.customer_name}`, 14, 49);
    if (fullSale.customer_phone) doc.text(`Phone: ${fullSale.customer_phone}`, 14, 56);
    
    let y = 70;
    doc.setFontSize(14);
    doc.text('Items:', 14, y);
    y += 10;
    
    doc.setFontSize(12);
    fullSale.items.forEach((item: any) => {
      doc.text(`${item.material_name} - Qty: ${item.quantity} - Total: $${item.total.toFixed(2)}`, 14, y);
      y += 8;
    });
    
    y += 10;
    doc.setFontSize(14);
    doc.text(`Subtotal: $${fullSale.subtotal.toFixed(2)}`, 14, y);
    doc.text(`Discount: $${fullSale.discount.toFixed(2)}`, 14, y + 8);
    doc.text(`Tax: $${fullSale.tax_amount.toFixed(2)}`, 14, y + 16);
    doc.setFontSize(16);
    doc.text(`Grand Total: $${fullSale.grand_total.toFixed(2)}`, 14, y + 26);
    
    if (fullSale.customer_signature) {
      y += 40;
      doc.setFontSize(12);
      doc.text('Customer Signature:', 14, y);
      try {
        doc.addImage(fullSale.customer_signature, 'PNG', 14, y + 5, 50, 25);
      } catch (e) { console.error('Failed to add signature to PDF', e); }
    }
    
    const pdfBlob = doc.output('blob');
    const filename = `Invoice_${fullSale.invoice_number}.pdf`;
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `Invoice ${fullSale.invoice_number}`,
        text: 'Please find your invoice attached.',
        files: [file]
      });
    } else {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.location.href = `mailto:?subject=Invoice ${fullSale.invoice_number}&body=Your invoice has been downloaded. Please attach it to this email.`;
    }
  } catch (err) {
    console.error(err);
    toast.error('Failed to generate or send invoice.');
  }
};
