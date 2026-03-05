import Tesseract from 'tesseract.js';
import { pdf } from 'pdf-to-img';
import fs from 'fs';

async function testOCR() {
    console.log("Converting PDF to images...");
    const pdfPath = '/Users/eugeniucazmal/Downloads/dev_office/03 martie 2026/cashpot_online/190269_ROM.SFX.1001.01#132.pdf';

    const document = await pdf(pdfPath, { scale: 2 });
    let pageNum = 0;

    for await (const image of document) {
        pageNum++;
        if (pageNum > 1) break; // Only first page

        console.log(`OCR on page ${pageNum} (${image.length} bytes)...`);

        const result = await Tesseract.recognize(image, 'ron+eng', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    process.stdout.write(`\rProgress: ${Math.round(m.progress * 100)}%`);
                }
            }
        });

        console.log("\n\n--- OCR TEXT (first 3000 chars) ---");
        console.log(result.data.text.substring(0, 3000));
        console.log("--- END ---");
        console.log("Total text length:", result.data.text.length);
    }
}

testOCR().catch(console.error);
