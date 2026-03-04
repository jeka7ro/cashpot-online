import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const dataBuffer = fs.readFileSync('/Users/eugeniucazmal/Downloads/dev_office/03 martie 2026/cashpot_online/190269_ROM.SFX.1001.01#132.pdf');

pdfParse(dataBuffer).then(function (data) {
    console.log(data.text);
}).catch(function (err) {
    console.error(err);
});
