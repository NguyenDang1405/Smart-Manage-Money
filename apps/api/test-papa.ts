import fs from 'fs';
import Papa from 'papaparse';

const fileContent = fs.readFileSync('dummy.csv', "utf8");
const parsed = Papa.parse(fileContent, {
  header: true,
  skipEmptyLines: true,
});

console.log(parsed.data);
