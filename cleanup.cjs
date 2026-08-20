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

// 3. src/pages/SettingsPage.tsx
modifyFile('src/pages/SettingsPage.tsx', content => {
  return content
    .replace(/const handleSeedDemoData \= async \(\) \=\> \{[\s\S]*?\}\;\n+/, '')
    .replace(/\s*<button\s+type="button"\s+onClick=\{handleSeedDemoData\}[\s\S]*?<Database className="w-4 h-4" \/> Reset \/ Load Full Demo Data\s+<\/button>\n/, '\n');
});

