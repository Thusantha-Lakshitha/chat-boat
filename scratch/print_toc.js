const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfPath = path.join(__dirname, '..', 'documents', 'Student_Handbook_2024-2025_Merge.pdf');
const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
  const text = data.text;
  const lines = text.split('\n');
  
  console.log("=== Table of Contents Search ===");
  // Let's print lines containing 'content' or matching a TOC layout (numbers with titles)
  let printing = false;
  let linesPrinted = 0;
  
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (line.toLowerCase() === 'contents') {
      printing = true;
    }
    
    if (printing) {
      console.log(`Line ${idx}: ${line}`);
      linesPrinted++;
      if (linesPrinted > 150) {
        break;
      }
    }
  }
}).catch(err => {
  console.error("Error:", err);
});
