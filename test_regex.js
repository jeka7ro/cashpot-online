const fs = require('fs');
let content = fs.readFileSync('src/pages/LocationPLDetail.jsx', 'utf8');

// Use word boundary \b and negative lookbehind if supported, but let's just use carefully ordered replace
const replacements = [
  ['bg-slate-900', 'bg-white dark:bg-slate-900'],
  ['bg-slate-800/50', 'bg-slate-50 dark:bg-slate-800/50'],
  ['bg-slate-800/80', 'bg-slate-100 dark:bg-slate-800/80'],
  ['bg-slate-800/60', 'bg-slate-100 dark:bg-slate-800/60'],
  ['hover:bg-slate-800/30', 'hover:bg-slate-50 dark:hover:bg-slate-800/30'],
  ['hover:bg-slate-700', 'hover:bg-slate-200 dark:hover:bg-slate-700'],
  ['bg-slate-800', 'bg-slate-100 dark:bg-slate-800'],
  
  // Borders
  ['border-slate-800', 'border-slate-200 dark:border-slate-800'],
  ['border-slate-700', 'border-slate-200 dark:border-slate-700'],
  ['border-slate-600', 'border-slate-300 dark:border-slate-600'],
  ['border-slate-500', 'border-slate-400 dark:border-slate-500'],
  ['divide-slate-800/60', 'divide-slate-200 dark:divide-slate-800/60'],
  
  // Text
  ['text-slate-200', 'text-slate-800 dark:text-slate-200'],
  ['text-slate-300', 'text-slate-700 dark:text-slate-300'],
  ['text-slate-400', 'text-slate-500 dark:text-slate-400'],
  ['hover:text-white', 'hover:text-slate-900 dark:hover:text-white'],
  ['hover:text-slate-200', 'hover:text-slate-700 dark:hover:text-slate-200'],
  ['text-emerald-400', 'text-emerald-600 dark:text-emerald-400'],
  ['text-blue-400', 'text-blue-600 dark:text-blue-400']
];

let res = content;
for (const [find, replace] of replacements) {
    // Only replace if it doesn't already have dark: prefix, and is a full token
    // We can use a regex that matches `find` only if not preceded by `dark:` or `dark:hover:`
    const regex = new RegExp(`(?<!dark:)(?<!dark:hover:)\\\\b${find.replace(/\\//g, '\\\\/')}\\\\b(?!/)`, 'g');
    res = res.replace(regex, replace);
}

fs.writeFileSync('src/pages/LocationPLDetail.jsx', res);
console.log('Success');
