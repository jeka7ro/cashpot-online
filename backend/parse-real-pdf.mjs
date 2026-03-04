import fs from 'fs';
import pdfParse from 'pdf-parse';

async function parse() {
  const file = fs.readFileSync('/Users/eugeniucazmal/Downloads/299724.pdf');
  const data = await pdfParse(file);
  console.log("TEXT START");
  console.log(data.text);
  console.log("TEXT END");
}
parse();
