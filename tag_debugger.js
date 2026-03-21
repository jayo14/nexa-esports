import fs from 'fs';

const content = fs.readFileSync('c:\\Users\\opene\\Desktop\\Moi\\nexa-esports\\src\\pages\\Statistics.tsx', 'utf8');
const lines = content.split('\n');

let stack = [];
let lineNum = 0;

for (let line of lines) {
    lineNum++;
    const openMatches = line.matchAll(/<(div|header|section|CardContent|Card|motion\.div|motion\.tr|table|tbody|tr|td|th)\b/g);
    for (const match of openMatches) {
        stack.push({tag: match[1], line: lineNum});
    }

    const closeMatches = line.matchAll(/<\/(div|header|section|CardContent|Card|motion\.div|motion\.tr|table|tbody|tr|td|th)>/g);
    for (const match of closeMatches) {
        const last = stack.pop();
        if (last && last.tag !== match[1]) {
            console.log(`Mismatch at line ${lineNum}: Expected </${last.tag}> but saw </${match[1]}> (Open at line ${last.line})`);
        }
    }
}

if (stack.length > 0) {
    console.log("Unclosed tags:");
    for (const item of stack) {
        console.log(`  <${item.tag}> opened at line ${item.line}`);
    }
} else {
    console.log("All tags balanced!");
}
