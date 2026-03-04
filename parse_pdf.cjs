const fs = require('fs');
const pdfParse = require('pdf-parse');

const buffer = fs.readFileSync('/Users/eugeniucazmal/Downloads/dev_office/03 martie 2026/cashpot_online/190269_ROM.SFX.1001.01#132.pdf');
pdfParse(buffer).then(data => console.log('TEXT:', data.text)).catch(err => console.error(err));
