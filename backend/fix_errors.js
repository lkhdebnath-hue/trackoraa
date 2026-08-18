const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src', 'controllers');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');

  let updated = false;

  const regex = /catch\s*\(\s*error(?::\s*any)?\s*\)\s*\{\s*(console\.error\([^\)]+\);)\s*return\s*res\.status\(500\)\.json\(\{\s*message\s*:\s*([^}]+)\s*\}\);\s*\}/g;

  content = content.replace(regex, (match, consoleLine, messageStr) => {
    updated = true;
    return `catch (error: any) {
      ${consoleLine}
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: ${messageStr} });
    }`;
  });

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', f);
  }
});
