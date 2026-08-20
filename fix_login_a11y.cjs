const fs = require('fs');
let content = fs.readFileSync('src/pages/Login.tsx', 'utf8');

content = content.replace(
  '<input\n                  type="email"',
  '<input\n                  aria-label="Email Address"\n                  type="email"'
);
content = content.replace(
  '<input\n                  type="password"',
  '<input\n                  aria-label="Password"\n                  type="password"'
);
content = content.replace(
  '<button\n              type="submit"',
  '<button\n              aria-label="Sign In"\n              type="submit"'
);

fs.writeFileSync('src/pages/Login.tsx', content);
