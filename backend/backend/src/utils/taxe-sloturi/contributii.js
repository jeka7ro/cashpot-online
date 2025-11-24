// Stocare date
let slotsData = {}; // { '2025-01': { 'Craiova': 73, 'Pitesti': 102, ... }, ... }
let contributions = []; // [{ month: 'Ianuarie', monthNum: '01', year: '2025', amount: 1000 }, ...]

// Locații valide
const validLocations = ['Craiova', 'Pitesti', 'Ploiesti (centru)', 'Ploiesti (nord)', 'Valcea'];

// Mapping lunilor
const monthMap = {
    'ianuarie': '01', 'january': '01',
    'februarie': '02', 'february': '02',
    'martie': '03', 'march': '03',
    'aprilie': '04', 'april': '04',
    'mai': '05', 'may': '05',
    'iunie': '06', 'june': '06',
    'iulie': '07', 'july': '07',
    'august': '08',
    'septembrie': '09', 'september': '09',
    'octombrie': '10', 'october': '10',
    'noiembrie': '11', 'november': '11',
    'decembrie': '12', 'december': '12'
};

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

// Funcție pentru a obține numărul lunii
function getMonthNumber(monthName) {
    const normalized = monthName.toLowerCase().trim();
    return monthMap[normalized] || null;
}

// Funcție pentru a parsea luna și anul din diferite formate
function parseMonthAndYear(monthYearStr) {
    const str = monthYearStr.trim();
    
    // Format: "ian 2025", "martie 2025", etc.
    const match1 = str.match(/^([a-zăîâșț]+)\s+(\d{4})$/i);
    if (match1) {
        const monthName = match1[1];
        const year = match1[2];
        const monthNum = getMonthNumber(monthName);
        if (monthNum) {
            return { monthNum, year, monthName: monthName };
        }
    }
    
    // Format: "Feb-25", "Aug-25", "Nov-24", etc.
    const match2 = str.match(/^([a-z]+)-(\d{2})$/i);
    if (match2) {
        const monthAbbr = match2[1];
        const yearShort = match2[2];
        const year = yearShort.length === 2 ? `20${yearShort}` : yearShort;
        
        // Mapping pentru abrevieri engleze
        const abbrMap = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
            'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        };
        
        const monthNum = abbrMap[monthAbbr.toLowerCase()];
        if (monthNum) {
            return { monthNum, year, monthName: monthAbbr };
        }
    }
    
    // Format: doar luna (presupunem anul 2025)
    const monthNum = getMonthNumber(str);
    if (monthNum) {
        return { monthNum, year: '2025', monthName: str };
    }
    
    return null;
}

// Funcție pentru a genera data în format DD.MM.YYYY (prima zi a lunii)
function generateDate(year, monthNum) {
    if (!year || !monthNum) return null;
    return `01.${monthNum}.${year}`;
}

// Funcție pentru a parsea tabelul cu sloturi
function parseSlotsData(inputText) {
    const lines = inputText.split('\n').map(line => line.trim()).filter(line => line);
    const slots = {};
    
    // Caută header-ul
    let headerFound = false;
    let headerIndex = -1;
    const locationIndices = {};
    
    for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split('\t').map(p => p.trim());
        if (parts.some(p => p.toLowerCase() === 'lună' || p.toLowerCase() === 'luna' || p.toLowerCase() === 'month')) {
            headerFound = true;
            headerIndex = i;
            // Găsește indicii coloanelor pentru fiecare locație
            parts.forEach((part, idx) => {
                const normalized = part.toLowerCase();
                validLocations.forEach(loc => {
                    if (normalized.includes(loc.toLowerCase().split(' ')[0]) || 
                        (loc === 'Ploiesti (centru)' && normalized.includes('centru')) ||
                        (loc === 'Ploiesti (nord)' && normalized.includes('nord'))) {
                        locationIndices[loc] = idx;
                    }
                });
            });
            break;
        }
    }
    
    if (!headerFound) {
        throw new Error('Header-ul cu "Lună" nu a fost găsit. Verifică formatul datelor.');
    }
    
    // Obține anul selectat sau folosește 2025 ca default
    const yearSelect = document.getElementById('slotsYear');
    const selectedYear = yearSelect ? yearSelect.value : '2025';
    
    // Parsează datele
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const parts = lines[i].split('\t').map(p => p.trim());
        const monthName = parts[0];
        const monthNum = getMonthNumber(monthName);
        
        if (!monthNum) continue;
        
        const year = selectedYear;
        const key = `${year}-${monthNum}`;
        
        if (!slots[key]) {
            slots[key] = {};
        }
        
        validLocations.forEach(loc => {
            if (locationIndices[loc] !== undefined) {
                const slotCount = parseNumber(parts[locationIndices[loc]] || '0');
                slots[key][loc] = slotCount;
            }
        });
    }
    
    return slots;
}

// Funcție pentru a parsea contribuțiile
function parseContributionsData(inputText) {
    const lines = inputText.split('\n').map(line => line.trim()).filter(line => line);
    const contributions = [];
    const contributionMap = {}; // Pentru agregarea duplicatelor: { '2024-01': { amount: 0, count: 0 } }
    
    // Verifică dacă datele sunt pe o singură linie (format orizontal)
    if (lines.length === 1 || (lines.length === 2 && lines[0].split('\t').length > 5)) {
        // Format orizontal: toate lunile pe o linie
        const parts = lines[lines.length - 1].split('\t').map(p => p.trim());
        
        parts.forEach(part => {
            // Încearcă să găsească pattern-uri de tip "ian 2025" sau "Feb-25" urmate de număr
            // Sau doar număr dacă luna este în coloana anterioară
            const monthYearMatch = part.match(/^([a-zăîâșț]+(?:\s+\d{4}|-\d{2})?)$/i);
            if (monthYearMatch) {
                const monthYear = parseMonthAndYear(part);
                if (monthYear) {
                    // Caută valoarea în următoarea parte sau în aceeași parte
                    const currentIndex = parts.indexOf(part);
                    if (currentIndex < parts.length - 1) {
                        const amountStr = parts[currentIndex + 1];
                        const amount = parseNumber(amountStr);
                        if (amount > 0) {
                            const key = `${monthYear.year}-${monthYear.monthNum}`;
                            if (!contributionMap[key]) {
                                contributionMap[key] = { amount: 0, count: 0, monthYear: monthYear };
                            }
                            contributionMap[key].amount += amount;
                            contributionMap[key].count++;
                        }
                    }
                }
            }
        });
        
        // Dacă nu a găsit nimic, încearcă să parseze fiecare pereche dată/lună-valoare
        if (Object.keys(contributionMap).length === 0) {
            for (let i = 0; i < parts.length; i += 2) {
                if (i + 1 >= parts.length) break;
                const dateOrMonthStr = parts[i];
                const amountStr = parts[i + 1];
                
                let monthYear = null;
                
                // Verifică dacă este format dată completă (DD.MM.YYYY)
                const dateMatch = dateOrMonthStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
                if (dateMatch) {
                    const day = dateMatch[1];
                    const month = dateMatch[2].padStart(2, '0');
                    const year = dateMatch[3];
                    // Obține numele lunii pentru afișare
                    const monthNames = {
                        '01': 'Ianuarie', '02': 'Februarie', '03': 'Martie', '04': 'Aprilie',
                        '05': 'Mai', '06': 'Iunie', '07': 'Iulie', '08': 'August',
                        '09': 'Septembrie', '10': 'Octombrie', '11': 'Noiembrie', '12': 'Decembrie'
                    };
                    monthYear = {
                        monthNum: month,
                        year: year,
                        monthName: monthNames[month] || `Luna ${month}`
                    };
                } else {
                    // Încearcă să parseze ca lună/an
                    monthYear = parseMonthAndYear(dateOrMonthStr);
                }
                
                if (monthYear) {
                    const amount = parseNumber(amountStr);
                    if (amount > 0) {
                        const key = `${monthYear.year}-${monthYear.monthNum}`;
                        if (!contributionMap[key]) {
                            contributionMap[key] = { amount: 0, count: 0, monthYear: monthYear };
                        }
                        contributionMap[key].amount += amount;
                        contributionMap[key].count++;
                    }
                }
            }
        }
        
        // Convertim map-ul în array (agregăm duplicatele)
        Object.values(contributionMap).forEach(item => {
            contributions.push({
                month: item.monthYear.monthName,
                monthNum: item.monthYear.monthNum,
                year: item.monthYear.year,
                amount: item.amount // Suma agregată
            });
        });
        
        if (contributions.length > 0) {
            return contributions;
        }
    }
    
    // Format vertical: fiecare linie = o lună + sumă
    let headerFound = false;
    let headerIndex = -1;
    let monthIndex = -1;
    let amountIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split('\t').map(p => p.trim().toLowerCase());
        if (parts.some(p => p.includes('lună') || p.includes('luna') || p.includes('month'))) {
            headerFound = true;
            headerIndex = i;
            parts.forEach((part, idx) => {
                if (part.includes('lună') || part.includes('luna') || part.includes('month')) {
                    monthIndex = idx;
                } else if (part.includes('sumă') || part.includes('amount') || part.includes('valoare') || part.includes('total')) {
                    amountIndex = idx;
                }
            });
            break;
        }
    }
    
    // Dacă nu găsește header, încearcă să parseze direct
    if (!headerFound) {
        headerIndex = -1;
        monthIndex = 0;
        amountIndex = 1;
    }
    
    // Folosim același contributionMap declarat la începutul funcției
    // Dacă nu există încă (pentru format vertical), îl inițializăm
    if (!contributionMap || Object.keys(contributionMap).length === 0) {
        // contributionMap este deja declarat la începutul funcției
    }
    
    // Parsează contribuțiile
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const parts = lines[i].split('\t').map(p => p.trim());
        if (parts.length < 2) continue;
        
        const dateOrMonthStr = parts[monthIndex] || '';
        const amountStr = parts[amountIndex] || '';
        
        if (!dateOrMonthStr || !amountStr) continue;
        
        let monthYear = null;
        
        // Verifică dacă este format dată completă (DD.MM.YYYY)
        const dateMatch = dateOrMonthStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (dateMatch) {
            const day = dateMatch[1];
            const month = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3];
            // Obține numele lunii pentru afișare
            const monthNames = {
                '01': 'Ianuarie', '02': 'Februarie', '03': 'Martie', '04': 'Aprilie',
                '05': 'Mai', '06': 'Iunie', '07': 'Iulie', '08': 'August',
                '09': 'Septembrie', '10': 'Octombrie', '11': 'Noiembrie', '12': 'Decembrie'
            };
            monthYear = {
                monthNum: month,
                year: year,
                monthName: monthNames[month] || `Luna ${month}`
            };
        } else {
            // Încearcă să parseze ca lună/an
            monthYear = parseMonthAndYear(dateOrMonthStr);
        }
        
        if (!monthYear) {
            console.warn(`Nu s-a putut parsea data/luna: ${dateOrMonthStr}`);
            continue;
        }
        
        const amount = parseNumber(amountStr);
        if (amount === 0) continue;
        
        // Agregăm contribuțiile duplicate (aceeași lună și an)
        const key = `${monthYear.year}-${monthYear.monthNum}`;
        if (!contributionMap[key]) {
            contributionMap[key] = {
                amount: 0,
                count: 0,
                monthYear: monthYear
            };
        }
        contributionMap[key].amount += amount;
        contributionMap[key].count++;
    }
    
    // Convertim map-ul în array (agregăm duplicatele)
    Object.values(contributionMap).forEach(item => {
        contributions.push({
            month: item.monthYear.monthName,
            monthNum: item.monthYear.monthNum,
            year: item.monthYear.year,
            amount: item.amount // Suma agregată
        });
    });
    
    return contributions;
}

// Funcție pentru a distribui o contribuție pe locații
function distributeContribution(contribution) {
    const key = `${contribution.year}-${contribution.monthNum}`;
    let monthSlots = slotsData[key];
    
    // Dacă nu există sloturi pentru anul specificat, încearcă să folosească sloturile din 2025
    if (!monthSlots && contribution.year === '2024') {
        const key2025 = `2025-${contribution.monthNum}`;
        monthSlots = slotsData[key2025];
        if (monthSlots) {
            console.log(`Folosind sloturile din 2025 pentru ${key}`);
        }
    }
    
    if (!monthSlots) {
        console.warn(`Nu s-au găsit sloturi pentru ${key} sau pentru 2025-${contribution.monthNum}`);
        return [];
    }
    
    // Calculează totalul de sloturi pentru luna respectivă
    const totalSlots = Object.values(monthSlots).reduce((sum, count) => sum + count, 0);
    
    if (totalSlots === 0) {
        console.warn(`Total sloturi este 0 pentru ${key}`);
        return [];
    }
    
    const results = [];
    const date = generateDate(contribution.year, contribution.monthNum);
    
    // Distribuie proporțional
    validLocations.forEach(location => {
        const slotCount = monthSlots[location] || 0;
        if (slotCount > 0) {
            const proportion = slotCount / totalSlots;
            const distributedAmount = contribution.amount * proportion;
            
            results.push({
                date: date,
                explanation: `Contributii salariale ${contribution.month} ${contribution.year}`,
                amount: formatNumber(distributedAmount),
                location: location,
                department: 'Taxe',
                expenditureType: 'Contributii salariale'
            });
        }
    });
    
    return results;
}

// Funcție pentru a afișa preview
function displayPreview(data) {
    const tbody = document.getElementById('previewBody');
    tbody.innerHTML = '';
    
    document.getElementById('rowCount').textContent = data.length;
    document.getElementById('contributionCount').textContent = contributions.length;
    
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

// Funcție pentru a procesa toate contribuțiile
function processContributions() {
    if (Object.keys(slotsData).length === 0) {
        alert('Te rugăm să importi mai întâi tabelul cu sloturi!');
        return;
    }
    
    if (contributions.length === 0) {
        alert('Te rugăm să importi mai întâi contribuțiile!');
        return;
    }
    
    const results = [];
    
    contributions.forEach(contribution => {
        const distributed = distributeContribution(contribution);
        results.push(...distributed);
    });
    
    // Sortează după dată și locație
    results.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.location.localeCompare(b.location);
    });
    
    displayPreview(results);
    window.processedData = results;
    
    // Salvează datele procesate
    saveToLocalStorage('contributii_processedData', results);
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
    link.download = `contributii_distribuite_${new Date().toISOString().split('T')[0]}.csv`;
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
    // Încarcă anul selectat
    const savedYear = loadFromLocalStorage('contributii_slotsYear');
    if (savedYear) {
        const yearSelect = document.getElementById('slotsYear');
        if (yearSelect) {
            yearSelect.value = savedYear;
        }
    }
    
    const savedSlots = loadFromLocalStorage('contributii_slotsData');
    if (savedSlots) {
        document.getElementById('slotsData').value = savedSlots;
        try {
            slotsData = parseSlotsData(savedSlots);
            const statusEl = document.getElementById('slotsStatus');
            statusEl.textContent = `✓ Sloturi importate: ${Object.keys(slotsData).length} luni`;
            statusEl.className = 'status-message success';
            statusEl.style.display = 'block';
        } catch (e) {
            console.warn('Eroare la încărcarea sloturilor salvate:', e);
        }
    }
    
    const savedContributions = loadFromLocalStorage('contributii_contributionsData');
    if (savedContributions) {
        document.getElementById('contributionsData').value = savedContributions;
        try {
            contributions = parseContributionsData(savedContributions);
            const statusEl = document.getElementById('contributionsStatus');
            statusEl.textContent = `✓ Contribuții importate: ${contributions.length}`;
            statusEl.className = 'status-message success';
            statusEl.style.display = 'block';
        } catch (e) {
            console.warn('Eroare la încărcarea contribuțiilor salvate:', e);
        }
    }
    
    // Dacă avem ambele, procesează
    if (Object.keys(slotsData).length > 0 && contributions.length > 0) {
        processContributions();
    }
});

// Salvează automat când se modifică input-urile
document.addEventListener('DOMContentLoaded', () => {
    const slotsInput = document.getElementById('slotsData');
    if (slotsInput) {
        slotsInput.addEventListener('input', () => {
            saveToLocalStorage('contributii_slotsData', slotsInput.value);
        });
    }
    
    const contributionsInput = document.getElementById('contributionsData');
    if (contributionsInput) {
        contributionsInput.addEventListener('input', () => {
            saveToLocalStorage('contributii_contributionsData', contributionsInput.value);
        });
    }
    
    const yearSelect = document.getElementById('slotsYear');
    if (yearSelect) {
        yearSelect.addEventListener('change', () => {
            saveToLocalStorage('contributii_slotsYear', yearSelect.value);
            // Re-parsează sloturile dacă există
            if (slotsInput && slotsInput.value.trim()) {
                try {
                    slotsData = parseSlotsData(slotsInput.value);
                    const statusEl = document.getElementById('slotsStatus');
                    statusEl.textContent = `✓ Sloturi importate: ${Object.keys(slotsData).length} luni`;
                    statusEl.className = 'status-message success';
                    statusEl.style.display = 'block';
                    
                    // Reprocesează dacă avem contribuții
                    if (contributions.length > 0) {
                        processContributions();
                    }
                } catch (e) {
                    console.warn('Eroare la re-parsare sloturi:', e);
                }
            }
        });
    }
});

// Event listeners
document.getElementById('parseSlotsBtn').addEventListener('click', () => {
    const inputText = document.getElementById('slotsData').value;
    if (!inputText.trim()) {
        alert('Te rugăm să lipești tabelul cu sloturi mai întâi!');
        return;
    }
    
    try {
        slotsData = parseSlotsData(inputText);
        const statusEl = document.getElementById('slotsStatus');
        statusEl.textContent = `✓ Sloturi importate: ${Object.keys(slotsData).length} luni`;
        statusEl.className = 'status-message success';
        statusEl.style.display = 'block';
        
        // Salvează în localStorage
        saveToLocalStorage('contributii_slotsData', inputText);
        
        // Dacă avem și contribuții, procesează
        if (contributions.length > 0) {
            processContributions();
        }
    } catch (error) {
        console.error('Eroare la parsare sloturi:', error);
        const statusEl = document.getElementById('slotsStatus');
        statusEl.textContent = `✗ Eroare: ${error.message}`;
        statusEl.className = 'status-message error';
        statusEl.style.display = 'block';
    }
});

document.getElementById('parseContributionsBtn').addEventListener('click', () => {
    const inputText = document.getElementById('contributionsData').value;
    if (!inputText.trim()) {
        alert('Te rugăm să lipești contribuțiile mai întâi!');
        return;
    }
    
    try {
        contributions = parseContributionsData(inputText);
        const statusEl = document.getElementById('contributionsStatus');
        statusEl.textContent = `✓ Contribuții importate: ${contributions.length}`;
        statusEl.className = 'status-message success';
        statusEl.style.display = 'block';
        
        // Salvează în localStorage
        saveToLocalStorage('contributii_contributionsData', inputText);
        
        // Dacă avem și sloturi, procesează
        if (Object.keys(slotsData).length > 0) {
            processContributions();
        }
    } catch (error) {
        console.error('Eroare la parsare contribuții:', error);
        const statusEl = document.getElementById('contributionsStatus');
        statusEl.textContent = `✗ Eroare: ${error.message}`;
        statusEl.className = 'status-message error';
        statusEl.style.display = 'block';
    }
});

document.getElementById('exportBtn').addEventListener('click', () => {
    if (!window.processedData || window.processedData.length === 0) {
        alert('Nu există date de exportat. Te rugăm să procesezi contribuțiile mai întâi.');
        return;
    }
    exportToCSV(window.processedData);
});

document.getElementById('copyBtn').addEventListener('click', () => {
    if (!window.processedData || window.processedData.length === 0) {
        alert('Nu există date de copiat. Te rugăm să procesezi contribuțiile mai întâi.');
        return;
    }
    copyToClipboard(window.processedData);
});

