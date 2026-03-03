const fs = require('fs');

const FILE_PATH = 'src/pages/LocationPLDetail.jsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// Array of [search regex, replace string]
const replacements = [
  // Backgrounds
  [/(?<!dark:)bg-slate-900\b/g, 'bg-white dark:bg-slate-900'],
  [/(?<!dark:)bg-slate-800\/5\b/g, 'bg-slate-50 dark:bg-slate-800/20'], // Just in case, this is not used commonly.
  [/(?<!dark:)bg-slate-800\/50\b/g, 'bg-slate-50 dark:bg-slate-800/50'],
  [/(?<!dark:)bg-slate-800\/80\b/g, 'bg-slate-100 dark:bg-slate-800/80'],
  [/(?<!dark:)bg-slate-800\/60\b/g, 'bg-slate-100 dark:bg-slate-800/60'],
  [/(?<!dark:hover:)hover:bg-slate-800\/30\b/g, 'hover:bg-slate-50 dark:hover:bg-slate-800/30'],
  [/(?<!dark:hover:)hover:bg-slate-700\b/g, 'hover:bg-slate-200 dark:hover:bg-slate-700'],
  [/(?<!dark:)bg-slate-800\b(?!\/)/g, 'bg-slate-100 dark:bg-slate-800'],

  // Borders
  [/(?<!dark:)border-slate-800\b/g, 'border-slate-200 dark:border-slate-800'],
  [/(?<!dark:)border-slate-700\b/g, 'border-slate-200 dark:border-slate-700'],
  [/(?<!dark:)border-slate-600\b/g, 'border-slate-300 dark:border-slate-600'],
  [/(?<!dark:hover:)hover:border-slate-500\b/g, 'hover:border-slate-400 dark:hover:border-slate-500'],
  [/(?<!dark:)divide-slate-800\/60\b/g, 'divide-slate-200 dark:divide-slate-800/60'],

  // Text
  [/(?<!dark:)text-slate-200\b/g, 'text-slate-800 dark:text-slate-200'],
  [/(?<!dark:)text-slate-300\b/g, 'text-slate-700 dark:text-slate-300'],
  [/(?<!dark:)text-slate-400\b/g, 'text-slate-500 dark:text-slate-400'],
  [/(?<!dark:hover:)hover:text-white\b/g, 'hover:text-slate-900 dark:hover:text-white'],
  [/(?<!dark:hover:)hover:text-slate-200\b/g, 'hover:text-slate-700 dark:hover:text-slate-200'],

  // Accents (optional, for charts/amounts)
  [/(?<!dark:)text-emerald-400\b/g, 'text-emerald-600 dark:text-emerald-400'],
  [/(?<!dark:)text-blue-400\b/g, 'text-blue-600 dark:text-blue-400']
];

for (const [regex, replacement] of replacements) {
  content = content.replace(regex, replacement);
}

fs.writeFileSync(FILE_PATH, content);
console.log('Script completed replacing values.');
