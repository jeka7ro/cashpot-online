// Funcție pentru a normaliza numerele
function parseNumber(str) {
    if (!str || str.trim() === '') return 0;
    let cleaned = str.toString().trim().replace(/\s/g, '');
    
    // Dacă există virgulă, atunci virgula este separator zecimal și punctele sunt separatori de mii
    if (cleaned.includes(',')) {
        // Format românesc: 7.957.815,00 sau 79578,15
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes('.')) {
        // Dacă nu există virgulă, verific dacă punctul este separator zecimal sau de mii
        const parts = cleaned.split('.');
        // Dacă ultima parte are 2-3 cifre, probabil e separator zecimal
        if (parts.length === 2 && parts[1].length <= 3 && /^\d+$/.test(parts[1])) {
            // Format englez: 79578.15 (punct ca separator zecimal)
            cleaned = cleaned;
        } else {
            // Format cu separatori de mii: 7.957.815 (elimină punctele)
            cleaned = cleaned.replace(/\./g, '');
        }
    }
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

// Funcție pentru a formata numărul cu 2 zecimale
function formatNumber(num) {
    return num.toFixed(2).replace('.', ',');
}

// Funcție pentru a genera data în format DD.MM.YYYY (prima zi a lunii)
function generateDate(year, monthNum) {
    if (!year || !monthNum) return null;
    return `01.${monthNum}.${year}`;
}

// Funcție pentru a obține toate lunile între două date
function getMonthsBetween(startYear, startMonth, endYear, endMonth) {
    const months = [];
    let currentYear = parseInt(startYear);
    let currentMonth = parseInt(startMonth);
    const endYearInt = parseInt(endYear);
    const endMonthInt = parseInt(endMonth);
    
    while (currentYear < endYearInt || (currentYear === endYearInt && currentMonth <= endMonthInt)) {
        months.push({
            year: currentYear.toString(),
            month: currentMonth.toString().padStart(2, '0')
        });
        
        currentMonth++;
        if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        }
    }
    
    return months;
}

// Mapping lunilor pentru extragere
const monthNameMap = {
    'ianuarie': '01', 'january': '01', 'ian': '01', 'jan': '01',
    'februarie': '02', 'february': '02', 'feb': '02',
    'martie': '03', 'march': '03', 'mar': '03',
    'aprilie': '04', 'april': '04', 'apr': '04',
    'mai': '05', 'may': '05',
    'iunie': '06', 'june': '06', 'iun': '06', 'jun': '06',
    'iulie': '07', 'july': '07', 'iul': '07', 'jul': '07',
    'august': '08', 'aug': '08',
    'septembrie': '09', 'september': '09', 'sep': '09',
    'octombrie': '10', 'october': '10', 'oct': '10',
    'noiembrie': '11', 'november': '11', 'nov': '11',
    'decembrie': '12', 'december': '12', 'dec': '12'
};

// Funcție pentru a extrage luna și anul din text
function extractMonthAndYear(text) {
    const lowerText = text.toLowerCase();
    
    // Caută pattern-uri de tip "Mai 2025", "mai 2025", etc.
    for (const [monthName, monthNum] of Object.entries(monthNameMap)) {
        const pattern = new RegExp(`\\b${monthName}\\s+(\\d{4})\\b`, 'i');
        const match = text.match(pattern);
        if (match) {
            return {
                month: monthNum,
                year: match[1],
                found: true
            };
        }
    }
    
    return { found: false };
}

// Funcție pentru a parsea datele
function parseData(inputText, startYear, startMonth) {
    const lines = inputText.split('\n').map(line => line.trim()).filter(line => line);
    const results = [];
    
    // Caută header-ul
    let headerFound = false;
    let headerIndex = -1;
    let dateIndex = -1;
    let explanationIndex = -1;
    let amountIndex = -1;
    let locationIndex = -1;
    let departmentIndex = -1;
    let expenditureTypeIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split('\t').map(p => p.trim().toLowerCase());
        if (parts.some(p => p.includes('explanation') || p.includes('descriere') || p.includes('explicație') || p.includes('service') || p.includes('date'))) {
            headerFound = true;
            headerIndex = i;
            parts.forEach((part, idx) => {
                if (part.includes('date') || part.includes('dată')) {
                    dateIndex = idx;
                } else if (part.includes('explanation') || part.includes('descriere') || part.includes('explicație') || part.includes('service')) {
                    explanationIndex = idx;
                } else if (part.includes('amount') || part.includes('sumă') || part.includes('valoare')) {
                    amountIndex = idx;
                } else if (part.includes('location') || part.includes('locație') || part.includes('locatie')) {
                    locationIndex = idx;
                } else if (part.includes('department') || part.includes('departament')) {
                    departmentIndex = idx;
                } else if (part.includes('expenditure') && part.includes('type')) {
                    expenditureTypeIndex = idx;
                }
            });
            break;
        }
    }
    
    // Dacă nu găsește header, încearcă să detecteze automat
    if (!headerFound) {
        headerIndex = -1;
        // Verifică prima linie pentru a determina structura
        const firstLine = lines[0].split('\t').map(p => p.trim());
        
        // Verifică dacă prima coloană este o dată (DD.MM.YYYY)
        if (firstLine.length > 0 && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(firstLine[0])) {
            dateIndex = 0;
            explanationIndex = 1;
            amountIndex = 2;
            if (firstLine.length >= 4) locationIndex = 3;
            if (firstLine.length >= 5) departmentIndex = 4;
            if (firstLine.length >= 6) expenditureTypeIndex = 5;
        } else {
            // Format fără dată
            explanationIndex = 0;
            amountIndex = 1;
            if (firstLine.length >= 3) locationIndex = 2;
            if (firstLine.length >= 4) departmentIndex = 3;
            if (firstLine.length >= 5) expenditureTypeIndex = 4;
        }
    }
    
    // Parsează datele
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const parts = lines[i].split('\t').map(p => p.trim());
        if (parts.length < 2) continue;
        
        // Dacă există coloana Date, o ignorăm (o vom genera noi)
        const explanation = explanationIndex !== -1 ? (parts[explanationIndex] || '') : '';
        const amountStr = amountIndex !== -1 ? (parts[amountIndex] || '') : '';
        const location = locationIndex !== -1 ? (parts[locationIndex] || '') : '';
        const department = departmentIndex !== -1 ? (parts[departmentIndex] || '') : 'Prestări servicii';
        const expenditureType = expenditureTypeIndex !== -1 ? (parts[expenditureTypeIndex] || '') : '';
        
        if (!explanation || !amountStr) continue;
        
        const amount = parseNumber(amountStr);
        if (amount === 0) continue;
        
        // Extrage luna și anul din explanation
        const monthYear = extractMonthAndYear(explanation);
        
        if (monthYear.found) {
            // Dacă găsește luna în explanation, începe de la luna URMĂTOARE
            let startMonthNum = parseInt(monthYear.month);
            let startYearNum = parseInt(monthYear.year);
            
            // Treci la luna următoare
            startMonthNum++;
            if (startMonthNum > 12) {
                startMonthNum = 1;
                startYearNum++;
            }
            
            // Obține lunile de la luna următoare până în decembrie 2025
            const months = getMonthsBetween(startYearNum.toString(), startMonthNum.toString().padStart(2, '0'), '2025', '12');
            
            // Elimină luna din explanation pentru a crea un text generic
            const baseExplanation = explanation.replace(/\b(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie|january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/gi, '').trim();
            
            // Creează un rând pentru fiecare lună
            months.forEach(month => {
                const monthNames = {
                    '01': 'Ianuarie', '02': 'Februarie', '03': 'Martie', '04': 'Aprilie',
                    '05': 'Mai', '06': 'Iunie', '07': 'Iulie', '08': 'August',
                    '09': 'Septembrie', '10': 'Octombrie', '11': 'Noiembrie', '12': 'Decembrie'
                };
                const monthName = monthNames[month.month] || month.month;
                const explanationWithMonth = baseExplanation ? `${baseExplanation} ${monthName} ${month.year}` : `${monthName} ${month.year}`;
                
                results.push({
                    date: generateDate(month.year, month.month),
                    explanation: explanationWithMonth,
                    amount: formatNumber(amount),
                    location: location,
                    department: department,
                    expenditureType: expenditureType || baseExplanation || explanationWithMonth
                });
            });
        } else {
            // Dacă nu găsește luna, folosește startMonth și startYear
            const months = getMonthsBetween(startYear, startMonth, '2025', '12');
            
            months.forEach(month => {
                const monthNames = {
                    '01': 'Ianuarie', '02': 'Februarie', '03': 'Martie', '04': 'Aprilie',
                    '05': 'Mai', '06': 'Iunie', '07': 'Iulie', '08': 'August',
                    '09': 'Septembrie', '10': 'Octombrie', '11': 'Noiembrie', '12': 'Decembrie'
                };
                const monthName = monthNames[month.month] || month.month;
                const explanationWithMonth = `${explanation} ${monthName} ${month.year}`;
                
                results.push({
                    date: generateDate(month.year, month.month),
                    explanation: explanationWithMonth,
                    amount: formatNumber(amount),
                    location: location,
                    department: department,
                    expenditureType: expenditureType || explanation
                });
            });
        }
    }
    
    // Sortează după dată, apoi după explanation
    results.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.explanation.localeCompare(b.explanation);
    });
    
    return results;
}

// Funcție pentru a afișa preview
function displayPreview(data) {
    const tbody = document.getElementById('previewBody');
    tbody.innerHTML = '';
    
    const inputCount = document.getElementById('inputData').value.split('\n').filter(line => line.trim()).length - 1; // -1 pentru header
    document.getElementById('rowCount').textContent = data.length;
    document.getElementById('inputCount').textContent = inputCount > 0 ? inputCount : 0;
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.date}</td>
            <td>${row.explanation}</td>
            <td>${row.amount}</td>
            <td>${row.location}</td>
            <td>${row.department}</td>
            <td>${row.expenditureType}</td>
        `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('previewSection').style.display = 'block';
}

// Funcție pentru a exporta ca CSV
function exportToCSV(data) {
    const headers = ['Date', 'Explanation', 'Amount', 'Location', 'Department', 'Expenditure Type'];
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
        const values = [
            row.date,
            `"${row.explanation}"`,
            row.amount,
            `"${row.location}"`,
            `"${row.department}"`,
            `"${row.expenditureType}"`
        ];
        csvRows.push(values.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prestari_servicii_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// Funcție pentru a copia în clipboard
function copyToClipboard(data) {
    // Nu includem header-ul, doar datele
    const rows = [];
    
    data.forEach(row => {
        const values = [
            row.date,
            row.explanation,
            row.amount,
            row.location,
            row.department,
            row.expenditureType
        ];
        rows.push(values.join('\t'));
    });
    
    const text = rows.join('\n');
    navigator.clipboard.writeText(text).then(() => {
        alert('Datele au fost copiate în clipboard! Poți să le lipești direct în Google Sheets.');
    }).catch(err => {
        console.error('Eroare la copiere:', err);
        alert('Eroare la copiere. Te rugăm să folosești exportul CSV.');
    });
}

// Funcții pentru localStorage
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('Nu s-au putut salva datele în localStorage:', e);
    }
}

function loadFromLocalStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        console.warn('Nu s-au putut încărca datele din localStorage:', e);
        return null;
    }
}

// Încarcă datele salvate la încărcarea paginii
window.addEventListener('DOMContentLoaded', () => {
    const savedInput = loadFromLocalStorage('prestari_inputData');
    if (savedInput) {
        document.getElementById('inputData').value = savedInput;
    }
    
    const savedStartMonth = loadFromLocalStorage('prestari_startMonth');
    if (savedStartMonth) {
        document.getElementById('startMonth').value = savedStartMonth;
    }
    
    const savedStartYear = loadFromLocalStorage('prestari_startYear');
    if (savedStartYear) {
        document.getElementById('startYear').value = savedStartYear;
    }
    
    const savedParsedData = loadFromLocalStorage('prestari_parsedData');
    if (savedParsedData && savedParsedData.length > 0) {
        displayPreview(savedParsedData);
        window.parsedData = savedParsedData;
    }
});

// Salvează automat când se modifică input-urile
document.addEventListener('DOMContentLoaded', () => {
    const inputData = document.getElementById('inputData');
    if (inputData) {
        inputData.addEventListener('input', () => {
            saveToLocalStorage('prestari_inputData', inputData.value);
        });
    }
    
    const startMonth = document.getElementById('startMonth');
    if (startMonth) {
        startMonth.addEventListener('change', () => {
            saveToLocalStorage('prestari_startMonth', startMonth.value);
        });
    }
    
    const startYear = document.getElementById('startYear');
    if (startYear) {
        startYear.addEventListener('change', () => {
            saveToLocalStorage('prestari_startYear', startYear.value);
        });
    }
});

// Event listeners
document.getElementById('parseBtn').addEventListener('click', () => {
    const inputText = document.getElementById('inputData').value;
    if (!inputText.trim()) {
        alert('Te rugăm să lipești datele mai întâi!');
        return;
    }
    
    const startMonth = document.getElementById('startMonth').value;
    const startYear = document.getElementById('startYear').value;
    
    try {
        const parsedData = parseData(inputText, startYear, startMonth);
        if (parsedData.length === 0) {
            alert('Nu s-au găsit date valide. Verifică formatul datelor copiate.');
            return;
        }
        displayPreview(parsedData);
        window.parsedData = parsedData;
        
        // Salvează în localStorage
        saveToLocalStorage('prestari_inputData', inputText);
        saveToLocalStorage('prestari_startMonth', startMonth);
        saveToLocalStorage('prestari_startYear', startYear);
        saveToLocalStorage('prestari_parsedData', parsedData);
        
        const statusEl = document.getElementById('parseStatus');
        statusEl.textContent = `✓ Date procesate: ${parsedData.length} rânduri generate`;
        statusEl.className = 'status-message success';
        statusEl.style.display = 'block';
    } catch (error) {
        console.error('Eroare la parsare:', error);
        const statusEl = document.getElementById('parseStatus');
        statusEl.textContent = `✗ Eroare: ${error.message}`;
        statusEl.className = 'status-message error';
        statusEl.style.display = 'block';
    }
});

document.getElementById('exportBtn').addEventListener('click', () => {
    if (!window.parsedData || window.parsedData.length === 0) {
        alert('Nu există date de exportat. Te rugăm să parsezi datele mai întâi.');
        return;
    }
    exportToCSV(window.parsedData);
});

document.getElementById('copyBtn').addEventListener('click', () => {
    if (!window.parsedData || window.parsedData.length === 0) {
        alert('Nu există date de copiat. Te rugăm să parsezi datele mai întâi.');
        return;
    }
    copyToClipboard(window.parsedData);
});

