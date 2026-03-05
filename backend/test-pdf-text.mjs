import fs from 'fs';
import pdfParse from 'pdf-parse';

async function test() {
    // Test cu PDF-ul care are text selectabil (190269)
    const file = fs.readFileSync('/Users/eugeniucazmal/Downloads/dev_office/03 martie 2026/cashpot_online/190269_ROM.SFX.1001.01#132.pdf');
    const data = await pdfParse(file);
    console.log("TEXT LENGTH:", data.text.length);
    console.log("--- FIRST 2000 CHARS ---");
    console.log(data.text.substring(0, 2000));
    console.log("--- END ---");
}
test();
