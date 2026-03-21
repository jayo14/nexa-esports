import fs from 'fs';

const content = fs.readFileSync('c:\\Users\\opene\\Desktop\\Moi\\nexa-esports\\src\\pages\\Statistics.tsx', 'utf8');
const lines = content.split('\n');

let openDivs = 0;
let closeDivs = 0;
let openHeaders = 0;
let closeHeaders = 0;
let openSections = 0;
let closeSections = 0;

for (let line of lines) {
    openDivs += (line.match(/<div/g) || []).length;
    closeDivs += (line.match(/<\/div/g) || []).length;
    openHeaders += (line.match(/<header/g) || []).length;
    closeHeaders += (line.match(/<\/header/g) || []).length;
}

console.log(`Divs: ${openDivs} open, ${closeDivs} close`);
console.log(`Headers: ${openHeaders} open, ${closeHeaders} close`);
