const fs = require('fs');

const content = fs.readFileSync('server.ts', 'utf8');

const lines = content.split('\n');
let newLines = [];
let insideSeed = false;
let openBraces = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('async function seedLargeDemoData')) {
    insideSeed = true;
    openBraces = 0;
  }
  
  if (insideSeed) {
    // simple brace counting
    for (let char of line) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
    }
    if (openBraces === 0) {
      insideSeed = false;
    }
  } else {
    // don't include the preceding comment either
    if (line.includes('// 5. Database Large Demo Seeding')) {
       // skip
    } else {
       newLines.push(line);
    }
  }
}

fs.writeFileSync('server.ts', newLines.join('\n'));
console.log('Removed seedLargeDemoData using brace counting.');
