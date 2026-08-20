const fs = require('fs');
let content = fs.readFileSync('src/pages/BarcodePrintPage.tsx', 'utf8');

content = content.replace(
  '<button\\n            onClick={toggleSelectAll}',
  '<button\\n            aria-label="Select or Deselect All Materials"\\n            onClick={toggleSelectAll}'
);
content = content.replace(
  '<button\\n            onClick={() => setIsPreviewOpen(true)}',
  '<button\\n            aria-label="Open PDF Generator Preview"\\n            onClick={() => setIsPreviewOpen(true)}'
);
fs.writeFileSync('src/pages/BarcodePrintPage.tsx', content);
