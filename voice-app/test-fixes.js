const fs = require("fs");

// Simulate the extractNumber function
function extractNumber(text) {
    let lowerText = text.toLowerCase();
    
    // FIX 1: Split concatenated words
    const concatWords = {
        'twothousand': 'two thousand', 'threethousand': 'three thousand',
        'fivehundred': 'five hundred'
    };
    for (const [concat, split] of Object.entries(concatWords)) {
        lowerText = lowerText.replace(new RegExp(concat, 'g'), split);
    }
    
    // FIX 2: Handle decimal multipliers
    const decimalMatch = lowerText.match(/(\d+\.\d+)\s*(million|thousand|hundred)/i);
    if (decimalMatch) {
        const decimal = parseFloat(decimalMatch[1]);
        const mult = decimalMatch[2].toLowerCase();
        const multipliers = { hundred: 100, thousand: 1000, million: 1000000 };
        return Math.round(decimal * multipliers[mult]);
    }

    const hasMultiplier = /\b(hundred|thousand|million|billion)\b/i.test(lowerText);

    // FIX 3: If no multiplier words, pick largest number
    if (!hasMultiplier) {
        const allNumbers = text.match(/\d+/g);
        if (allNumbers && allNumbers.length > 0) {
            const numbers = allNumbers.map(n => parseInt(n.replace(/,/g, '')));
            return Math.max(...numbers);
        }
    }

    const wordNumbers = {
        'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
        'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
        'hundred': 100
    };

    const words = lowerText
        .replace(/dollars?/g, '')
        .replace(/[.,]/g, '')
        .replace(/\band\b/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0);

    let result = 0;
    let current = 0;

    for (const word of words) {
        if (/^\d+$/.test(word)) {
            current += parseInt(word);
        } else if (wordNumbers[word] !== undefined) {
            current += wordNumbers[word];
        } else if (word === 'hundred') {
            current *= 100;
        } else if (word === 'thousand') {
            current *= 1000;
            result += current;
            current = 0;
        } else if (word === 'million') {
            current *= 1000000;
            result += current;
            current = 0;
        }
    }

    result += current;
    return result > 0 ? result : null;
}

const tests = [
    ["1.2 million", 1200000],
    ["450 450000", 450000],
    ["twothousand", 2000],
    ["four hundred fifty thousand", 450000]
];

let passed = 0;
for (const [input, expected] of tests) {
    const result = extractNumber(input);
    const ok = result === expected;
    if (ok) passed++;
    console.log(`${ok ? "PASS" : "FAIL"}: "${input}" => ${result} (expected ${expected})`);
}
console.log(`\n${passed}/${tests.length} tests passed`);
