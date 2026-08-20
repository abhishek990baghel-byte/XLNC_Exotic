const fs = require('fs');

function modifyFile(filePath, replacer) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = replacer(content);
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log('Updated', filePath);
    } else {
      console.log('No changes needed in', filePath);
    }
  } else {
    console.log('Not found:', filePath);
  }
}

// 1. src/components/PrintPreviewModal.tsx
modifyFile('src/components/PrintPreviewModal.tsx', content => {
  return content
    .replace(/const handlePrint \= \(\) \=\> \{[\s\S]*?\}\;\n+/, '')
    .replace(/<button\s+onClick=\{handlePrint\}[\s\S]*?<Printer className="w-4 h-4" \/> Print Labels\s+<\/button>\s+/, '');
});

// 1b. src/pages/BarcodePrintPage.tsx
modifyFile('src/pages/BarcodePrintPage.tsx', content => {
  return content
    .replace(/<button\s+onClick=\{\(\) \=\> setIsPreviewOpen\(true\)\}\s+disabled=\{selectedMaterials\.length === 0\}\s+className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-medium text-sm shadow-xs disabled:opacity-50"\s+>\s+<Printer className="w-4 h-4" \/> Print Barcode Labels\s+<\/button>\s+/, '');
});

// 2. src/pages/LedgerPage.tsx
modifyFile('src/pages/LedgerPage.tsx', content => {
  return content
    .replace(/import PrintLedgerModal from '\.\.\/components\/PrintLedgerModal';\n/, '')
    .replace(/const \[isPrintModalOpen, setIsPrintModalOpen\] = useState\(false\);\n/, '')
    .replace(/<button\s+onClick=\{\(\) \=\> setIsPrintModalOpen\(true\)\}[\s\S]*?<Printer className="w-4 h-4" \/> Print Ledger Report\s+<\/button>\s+/, '')
    .replace(/<div className="flex items-center gap-2">\s+<\/div>/, '')
    .replace(/<PrintLedgerModal[\s\S]*?isOpen=\{isPrintModalOpen\}[\s\S]*?onClose=\{\(\) \=\> setIsPrintModalOpen\(false\)\}[\s\S]*?\/>/, '');
});

