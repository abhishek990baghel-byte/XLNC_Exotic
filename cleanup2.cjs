const fs = require('fs');

const content = fs.readFileSync('server.ts', 'utf8');

let newContent = content.replace(/\/\/ 5\. Database Large Demo Seeding\nasync function seedLargeDemoData\([\s\S]*?\n\/\/ 6\. File Uploads Endpoint/g, '// 6. File Uploads Endpoint');

newContent = newContent.replace(/app\.post\('\/api\/admin\/seed-500', async \(req, res\) => \{[\s\S]*?\}\);\n\n/, '');

if (newContent !== content) {
  fs.writeFileSync('server.ts', newContent);
  console.log('Removed seedLargeDemoData and route in server.ts');
} else {
  console.log('No matches found in server.ts');
}
