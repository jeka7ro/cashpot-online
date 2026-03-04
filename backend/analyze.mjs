import fs from 'fs';
import pdfParse from 'pdf-parse';

async function analyze() {
    const filePath = '/Users/eugeniucazmal/Downloads/299724.pdf';
    if (fs.existsSync(filePath)) {
        const file = fs.readFileSync(filePath);
        const data = await pdfParse(file);
        console.log("Extracted text length:", data.text.length);
    } else {
        console.log("File not found");
    }
}
analyze();
