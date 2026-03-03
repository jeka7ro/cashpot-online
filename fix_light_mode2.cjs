const fs = require('fs');

const FILE_PATH = 'src/pages/LocationPLDetail.jsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// Array of [search regex, replace string]
const replacements = [
    // Text
    [/(?<!dark:)text-amber-400\b/g, 'text-amber-600 dark:text-amber-400'],
    [/(?<!dark:)text-rose-500\b/g, 'text-rose-600 dark:text-rose-500'],
    [/(?<!dark:)text-orange-400\b/g, 'text-orange-600 dark:text-orange-400'],
    [/(?<!dark:)text-pink-400\b/g, 'text-pink-600 dark:text-pink-400'],
    [/(?<!dark:)text-emerald-300\b/g, 'text-emerald-700 dark:text-emerald-300'],
    [/(?<!dark:)text-amber-300\b/g, 'text-amber-700 dark:text-amber-300'],
    [/(?<!dark:)text-rose-300\b/g, 'text-rose-700 dark:text-rose-300'],
    [/(?<!dark:)text-cyan-400\b/g, 'text-cyan-600 dark:text-cyan-400']
];

for (const [regex, replacement] of replacements) {
    content = content.replace(regex, replacement);
}

fs.writeFileSync(FILE_PATH, content);
console.log('Script completed replacing values.');
