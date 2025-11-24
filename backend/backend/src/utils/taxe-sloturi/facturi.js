// Stocare date
let slotsData = {}; // { '2025-01': { 'Craiova': 73, 'Pitesti': 102, ... }, ... }
let invoices = []; // [{ serie: '...', date: '01.01.2025', amount: 1000 }, ...]

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

// Funcție pentru a parsea data DD.MM.YYYY
function parseDate(dateStr) {
    const parts = dateStr.trim().split('.');
    if (parts.length !== 3) return null;
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return { day, month, year, key: `${year}-${month}` };
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
    
    // Parsează datele
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const parts = lines[i].split('\t').map(p => p.trim());
        const monthName = parts[0];
        const monthNum = getMonthNumber(monthName);
        
        if (!monthNum) continue;
        
        // Presupunem anul 2025 (poate fi modificat)
        const year = '2025';
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

// Funcție pentru a parsea facturile
function parseInvoicesData(inputText) {
    const lines = inputText.split('\n').map(line => line.trim()).filter(line => line);
    const invoices = [];
    
    // Caută header-ul
    let headerFound = false;
    let headerIndex = -1;
    let serieIndex = -1;
    let dateIndex = -1;
    let amountIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split('\t').map(p => p.trim().toLowerCase());
        if (parts.some(p => p.includes('serie') || p.includes('număr') || p.includes('nr'))) {
            headerFound = true;
            headerIndex = i;
            parts.forEach((part, idx) => {
                if (part.includes('serie') || part.includes('număr') || part.includes('nr')) {
                    serieIndex = idx;
                } else if (part.includes('dată') || part.includes('date') || part.includes('data')) {
                    dateIndex = idx;
                } else if (part.includes('sumă') || part.includes('amount') || part.includes('valoare')) {
                    amountIndex = idx;
                }
            });
            break;
        }
    }
    
    // Dacă nu găsește header, încearcă să parseze direct (presupunând format: Serie | Dată | Sumă)
    if (!headerFound) {
        headerIndex = -1;
        serieIndex = 0;
        dateIndex = 1;
        amountIndex = 2;
    }
    
    // Parsează facturile
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const parts = lines[i].split('\t').map(p => p.trim());
        if (parts.length < 3) continue;
        
        const serie = parts[serieIndex] || '';
        const dateStr = parts[dateIndex] || '';
        const amountStr = parts[amountIndex] || '';
        
        if (!serie || !dateStr || !amountStr) continue;
        
        const dateInfo = parseDate(dateStr);
        if (!dateInfo) continue;
        
        const amount = parseNumber(amountStr);
        if (amount === 0) continue;
        
        invoices.push({
            serie: serie,
            date: dateStr,
            dateInfo: dateInfo,
            amount: amount
        });
    }
    
    return invoices;
}

// Funcție pentru a distribui o factură pe locații
function distributeInvoice(invoice) {
    const key = invoice.dateInfo.key;
    const monthSlots = slotsData[key];
    
    if (!monthSlots) {
        console.warn(`Nu s-au găsit sloturi pentru ${key}`);
        return [];
    }
    
    // Calculează totalul de sloturi pentru luna respectivă
    const totalSlots = Object.values(monthSlots).reduce((sum, count) => sum + count, 0);
    
    if (totalSlots === 0) {
        console.warn(`Total sloturi este 0 pentru ${key}`);
        return [];
    }
    
    const results = [];
    
    // Distribuie proporțional
    validLocations.forEach(location => {
        const slotCount = monthSlots[location] || 0;
        if (slotCount > 0) {
            const proportion = slotCount / totalSlots;
            const distributedAmount = invoice.amount * proportion;
            
            results.push({
                date: invoice.date,
                explanation: `Factură ${invoice.serie}`,
                amount: formatNumber(distributedAmount),
                location: location,
                department: 'Taxe Sloturi',
                expenditureType: 'Factură distribuită'
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
    document.getElementById('invoiceCount').textContent = invoices.length;
    
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

// Funcție pentru a procesa toate facturile
function processInvoices() {
    if (Object.keys(slotsData).length === 0) {
        alert('Te rugăm să importi mai întâi tabelul cu sloturi!');
        return;
    }
    
    if (invoices.length === 0) {
        alert('Te rugăm să importi mai întâi facturile!');
        return;
    }
    
    const results = [];
    
    invoices.forEach(invoice => {
        const distributed = distributeInvoice(invoice);
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
    saveToLocalStorage('facturi_processedData', results);
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
    link.download = `facturi_distribuite_${new Date().toISOString().split('T')[0]}.csv`;
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
    const savedSlots = loadFromLocalStorage('facturi_slotsData');
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
    
    const savedInvoices = loadFromLocalStorage('facturi_invoicesData');
    if (savedInvoices) {
        document.getElementById('invoicesData').value = savedInvoices;
        try {
            invoices = parseInvoicesData(savedInvoices);
            const statusEl = document.getElementById('invoicesStatus');
            statusEl.textContent = `✓ Facturi importate: ${invoices.length}`;
            statusEl.className = 'status-message success';
            statusEl.style.display = 'block';
        } catch (e) {
            console.warn('Eroare la încărcarea facturilor salvate:', e);
        }
    }
    
    // Dacă avem ambele, procesează
    if (Object.keys(slotsData).length > 0 && invoices.length > 0) {
        processInvoices();
    }
});

// Salvează automat când se modifică input-urile
document.addEventListener('DOMContentLoaded', () => {
    const slotsInput = document.getElementById('slotsData');
    if (slotsInput) {
        slotsInput.addEventListener('input', () => {
            saveToLocalStorage('facturi_slotsData', slotsInput.value);
        });
    }
    
    const invoicesInput = document.getElementById('invoicesData');
    if (invoicesInput) {
        invoicesInput.addEventListener('input', () => {
            saveToLocalStorage('facturi_invoicesData', invoicesInput.value);
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
        saveToLocalStorage('facturi_slotsData', inputText);
        
        // Dacă avem și facturi, procesează
        if (invoices.length > 0) {
            processInvoices();
        }
    } catch (error) {
        console.error('Eroare la parsare sloturi:', error);
        const statusEl = document.getElementById('slotsStatus');
        statusEl.textContent = `✗ Eroare: ${error.message}`;
        statusEl.className = 'status-message error';
        statusEl.style.display = 'block';
    }
});

document.getElementById('parseInvoicesBtn').addEventListener('click', () => {
    const inputText = document.getElementById('invoicesData').value;
    if (!inputText.trim()) {
        alert('Te rugăm să lipești facturile mai întâi!');
        return;
    }
    
    try {
        invoices = parseInvoicesData(inputText);
        const statusEl = document.getElementById('invoicesStatus');
        statusEl.textContent = `✓ Facturi importate: ${invoices.length}`;
        statusEl.className = 'status-message success';
        statusEl.style.display = 'block';
        
        // Salvează în localStorage
        saveToLocalStorage('facturi_invoicesData', inputText);
        
        // Dacă avem și sloturi, procesează
        if (Object.keys(slotsData).length > 0) {
            processInvoices();
        }
    } catch (error) {
        console.error('Eroare la parsare facturi:', error);
        const statusEl = document.getElementById('invoicesStatus');
        statusEl.textContent = `✗ Eroare: ${error.message}`;
        statusEl.className = 'status-message error';
        statusEl.style.display = 'block';
    }
});

document.getElementById('exportBtn').addEventListener('click', () => {
    if (!window.processedData || window.processedData.length === 0) {
        alert('Nu există date de exportat. Te rugăm să procesezi facturile mai întâi.');
        return;
    }
    exportToCSV(window.processedData);
});

document.getElementById('copyBtn').addEventListener('click', () => {
    if (!window.processedData || window.processedData.length === 0) {
        alert('Nu există date de copiat. Te rugăm să procesezi facturile mai întâi.');
        return;
    }
    copyToClipboard(window.processedData);
});

