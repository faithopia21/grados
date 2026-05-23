const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let changedFiles = [];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content
    // Replace quoted strings
    .replace(/['"]ready_to_submit['"]/gi, "'Ready to Submit'")
    .replace(/['"]not_started['"]/gi, "'Not Started'")
    .replace(/['"]in_progress['"]/gi, "'In Progress'")
    .replace(/['"]Ready To_submit['"]/gi, "'Ready to Submit'")
    .replace(/['"]Not_Started['"]/gi, "'Not Started'")
    .replace(/['"]In_Progress['"]/gi, "'In Progress'")
    // Replace unquoted object keys
    .replace(/\bready_to_submit\s*:/gi, "'Ready to Submit':")
    .replace(/\bnot_started\s*:/gi, "'Not Started':")
    .replace(/\bin_progress\s*:/gi, "'In Progress':")
    // Some types might use these, let's fix type declarations
    .replace(/\|\s*'not_started'/gi, "| 'Not Started'")
    .replace(/\|\s*'in_progress'/gi, "| 'In Progress'")
    .replace(/\|\s*'ready_to_submit'/gi, "| 'Ready to Submit'");
    
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedFiles.push(file);
  }
});

console.log('Modified files:\\n' + changedFiles.join('\\n'));
