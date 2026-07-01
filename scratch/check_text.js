const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfPath = path.join(__dirname, '..', 'documents', 'Student_Handbook_2024-2025_Merge.pdf');
const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
  const text = data.text;
  console.log("=== First 2000 Characters ===");
  console.log(text.slice(0, 2000));
  
  // Let's search for case-insensitive matches of 'library' or 'medical' or 'hostel' or 'faculty' or 'student'
  const textLower = text.toLowerCase();
  const searchFor = ['library', 'medical', 'hostel', 'faculty', 'welfare', 'office', 'canteen'];
  searchFor.forEach(w => {
    let count = 0;
    let pos = textLower.indexOf(w);
    while (pos !== -1) {
      count++;
      pos = textLower.indexOf(w, pos + 1);
    }
    console.log(`Word "${w}" matches: ${count}`);
  });
}).catch(err => {
  console.error("Error:", err);
});
