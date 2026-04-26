const fs = require('fs');
const files = ['server.js', 'models/Mark.js', 'routes/api.js', 'seed.js', 'public/app.js'];
let out = 'Here is the codebase for the Student Performance Analyzer. Please read it so I can ask you questions about how it works (especially the MongoDB aggregation and indexing parts).\n\n';

files.forEach(f => {
  out += `\n\n============================================================\n`;
  out += `--- FILE: ${f} ---\n`;
  out += `============================================================\n\n`;
  out += fs.readFileSync(f, 'utf8');
});

fs.writeFileSync('code_export_for_chatgpt.txt', out);
console.log('Successfully created code_export_for_chatgpt.txt');
