import fs from 'fs';

const content = fs.readFileSync('c:\\Users\\opene\\Desktop\\Moi\\nexa-esports\\src\\pages\\Statistics.tsx', 'utf8');
const lines = content.split('\n');

let stack = [];
let lineNum = 0;

const tagsToTrack = ['div','header','section','CardContent','Card','motion.div','motion.tr','table','tbody','tr','td','th'];

for (let line of lines) {
    lineNum++;
    
    // Find all tags in line
    const tagMatches = line.matchAll(/<(\/?)([a-zA-Z0-9\.]+)\b[^>]*?(\/?)>/g);
    for (const match of tagMatches) {
        const isClosing = match[1] === '/';
        const tagName = match[2];
        const isSelfClosing = match[3] === '/';

        if (!tagsToTrack.includes(tagName)) continue;

        if (isClosing) {
            const last = stack.pop();
            if (last && last.tag !== tagName) {
                console.log(`Mismatch at line ${lineNum}: Expected </${last.tag}> but saw </${tagName}> (Open at line ${last.line})`);
            }
        } else if (!isSelfClosing) {
            stack.push({tag: tagName, line: lineNum});
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
