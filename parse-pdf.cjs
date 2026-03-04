const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('/Users/eugeniucazmal/Downloads/dev_office/03 martie 2026/cashpot_online/190269_ROM.SFX.1001.01#132.pdf');

pdf(dataBuffer).then(function (data) {
    console.log(data.text);
}).catch(function (err) {
    console.error(err);
});
