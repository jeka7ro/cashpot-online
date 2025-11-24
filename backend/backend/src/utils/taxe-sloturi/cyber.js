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

// Funcție pentru a determina Expenditure Type pe baza denumirii (folosită doar ca fallback)
function determineExpenditureType(description) {
    if (!description) return 'Cyber chirie server';
    
    const lowerDesc = description.toLowerCase();
    
    // Mapări pentru tipuri de cheltuieli Cyber
    if (lowerDesc.includes('kyc') || lowerDesc.includes('abonament kyc')) {
        return 'Cyber chirie server';
    } else if (lowerDesc.includes('vpn')) {
        return 'Cyber chirie server';
    } else if (lowerDesc.includes('server') || lowerDesc.includes('hosting') || lowerDesc.includes('chirie server')) {
        return 'Cyber chirie server';
    } else if (lowerDesc.includes('mentenanta') || lowerDesc.includes('mentenanță') || lowerDesc.includes('module')) {
        return 'Mentenanta module';
    } else if (lowerDesc.includes('securitate') || lowerDesc.includes('security')) {
        return 'Cyber securitate';
    } else if (lowerDesc.includes('backup') || lowerDesc.includes('back-up')) {
        return 'Cyber backup';
    } else {
        return 'Cyber chirie server'; // Default
    }
}

// Funcție pentru a extrage luna din text (ex: "Abonament KYC Noiembrie")
function extractMonthFromText(text) {
    const lowerText = text.toLowerCase();
    for (const [monthName, monthNum] of Object.entries(monthMap)) {
        if (lowerText.includes(monthName)) {
            // Încearcă să găsească anul în text
            const yearMatch = text.match(/\b(20\d{2})\b/);
            const year = yearMatch ? yearMatch[1] : null;
            return {
                month: monthNum,
                year: year,
                found: true
            };
        }
    }
    return { found: false };
}

// Funcție pentru a extrage datele din link-uri Oblio
async function extractFromOblioLinks(urls) {
    try {
        const response = await fetch('http://localhost:8001/extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ urls: urls })
        });
        
        if (!response.ok) {
            throw new Error('Server error');
        }
        
        return await response.json();
    } catch (error) {
        console.warn('Nu s-a putut conecta la serverul de extragere:', error);
        return null;
    }
}

// Funcție pentru a parsea facturile dintr-un textarea cu un tip specific de cheltuială
async function parseInvoicesFromTextarea(textareaValue, expenditureType, monthSelectId, yearSelectId) {
    const lines = textareaValue.split('\n').map(line => line.trim()).filter(line => line);
    const invoices = [];
    
    // Obține luna și anul din selectorul comun
    const commonMonthSelect = document.getElementById('commonMonth');
    const commonYearSelect = document.getElementById('commonYear');
    const selectedMonth = commonMonthSelect ? commonMonthSelect.value : '';
    const selectedYear = commonYearSelect ? commonYearSelect.value : '2025';
    
    if (!selectedMonth) {
        console.warn(`Luna nu este selectată pentru ${expenditureType}`);
        return [];
    }
    
    // Extrage link-urile pure (fără sume)
    const pureLinks = [];
    const linksWithData = [];
    
    for (const line of lines) {
        const parts = line.split('\t').map(p => p.trim()).filter(p => p);
        
        if (parts.length === 0) continue;
        
        if (parts[0].startsWith('http://') || parts[0].startsWith('https://')) {
            const link = parts[0];
            if (parts.length >= 2 && parts[1]) {
                // Are deja sumă
                linksWithData.push({ link, amount: parts[1], description: parts[2] || '' });
            } else {
                // Doar link - trebuie extras
                pureLinks.push(link);
            }
        } else {
            // Format fără link - poate fi doar sumă sau Denumire | Sumă
            if (parts.length === 1) {
                // Doar o valoare - probabil sumă
                const value = parts[0];
                // Verifică dacă e număr
                if (/^[\d.,]+$/.test(value.replace(/[.,]/g, ''))) {
                    linksWithData.push({ link: '', amount: value, description: '' });
                }
            } else if (parts.length >= 2) {
                // Denumire | Sumă sau Link | Sumă
                linksWithData.push({ link: '', amount: parts[parts.length - 1], description: parts.slice(0, -1).join(' ') });
            }
        }
    }
    
    // Extrage datele din link-urile pure
    if (pureLinks.length > 0) {
        const extractedData = await extractFromOblioLinks(pureLinks);
        if (extractedData) {
            extractedData.forEach((data, index) => {
                if (data.success && data.amount) {
                    linksWithData.push({
                        link: data.url,
                        amount: data.amount,
                        description: data.product || ''
                    });
                } else {
                    console.warn(`Nu s-au putut extrage datele din: ${data.url}`);
                }
            });
        }
    }
    
        // Procesează toate facturile - dacă sunt mai multe sume pe aceeași linie, le agregăm
    const invoiceMap = new Map(); // Pentru a evita duplicate
    
    for (const item of linksWithData) {
        const amountStr = item.amount;
        const link = item.link;
        let description = item.description;
        
        if (!amountStr || amountStr.trim() === '') {
            console.warn(`Factură fără sumă: ${link || description || 'necunoscut'}`);
            continue;
        }
        
        const amount = parseNumber(amountStr);
        if (isNaN(amount) || amount === 0) {
            console.warn(`Sumă invalidă: ${amountStr}`);
            continue;
        }
        
        // Folosește luna selectată
        const monthNames = {
            '01': 'Ianuarie', '02': 'Februarie', '03': 'Martie', '04': 'Aprilie',
            '05': 'Mai', '06': 'Iunie', '07': 'Iulie', '08': 'August',
            '09': 'Septembrie', '10': 'Octombrie', '11': 'Noiembrie', '12': 'Decembrie'
        };
        const monthName = monthNames[selectedMonth] || selectedMonth;
        
        // Determină corect Expenditure Type pe baza câmpului din care vine
        let finalExpenditureType = expenditureType;
        let finalDescription = description;
        
        // Dacă vine din câmpul KYC, setează corect
        if (monthSelectId === 'kycMonth') {
            finalExpenditureType = 'Abonament KYC';
            if (!finalDescription || finalDescription.trim() === '') {
                finalDescription = `Abonament KYC ${monthName} ${selectedYear}`;
            }
        }
        // Dacă vine din câmpul VPN, setează corect
        else if (monthSelectId === 'vpnMonth') {
            finalExpenditureType = 'Servicii VPN';
            if (!finalDescription || finalDescription.trim() === '') {
                finalDescription = `Servicii VPN ${monthName} ${selectedYear}`;
            }
        }
        // Dacă vine din câmpul Chirie Server
        else if (monthSelectId === 'chirieServerMonth') {
            finalExpenditureType = 'Cyber chirie server';
            if (!finalDescription || finalDescription.trim() === '') {
                finalDescription = `Chirie Server ${monthName} ${selectedYear}`;
            }
        }
        // Dacă vine din câmpul Mentenanta
        else if (monthSelectId === 'mentenantaMonth') {
            finalExpenditureType = 'Mentenanta module';
            if (!finalDescription || finalDescription.trim() === '') {
                finalDescription = `Mentenanta module ${monthName} ${selectedYear}`;
            }
        }
        
        // Adaugă luna dacă nu o are
        if (finalDescription) {
            const monthYear = extractMonthFromText(finalDescription);
            if (!monthYear.found) {
                finalDescription = `${finalDescription} ${monthName} ${selectedYear}`;
            }
        }
        
        const dateInfo = {
            day: '01',
            month: selectedMonth,
            year: selectedYear,
            key: `${selectedYear}-${selectedMonth}`
        };
        
        // Creează o cheie unică pentru a evita duplicate (folosind description pentru a diferenția KYC, VPN, etc.)
        const invoiceKey = `${finalExpenditureType}-${finalDescription}-${selectedYear}-${selectedMonth}`;
        
        if (invoiceMap.has(invoiceKey)) {
            // Dacă există deja, adaugă suma
            invoiceMap.get(invoiceKey).amount += amount;
        } else {
            // Creează o nouă factură
            invoiceMap.set(invoiceKey, {
                serie: `CYB ${dateInfo.year}-${dateInfo.month}`,
                date: generateDate(dateInfo.year, dateInfo.month),
                dateInfo: dateInfo,
                amount: amount,
                description: finalDescription,
                location: '',
                department: 'Servicii sistem informatic',
                expenditureType: finalExpenditureType,
                link: link
            });
        }
    }
    
    // Adaugă toate facturile unice în listă
    invoiceMap.forEach(invoice => {
        invoices.push(invoice);
    });
    
    return invoices;
}

// Funcție pentru a parsea facturile
async function parseInvoicesData() {
    const invoices = [];
    
    // Parsează fiecare tip de cheltuială
    const chirieServerText = document.getElementById('chirieServerLinks').value;
    const kycText = document.getElementById('kycLinks').value;
    const vpnText = document.getElementById('vpnLinks').value;
    const mentenantaText = document.getElementById('mentenantaLinks').value;
    
    if (chirieServerText.trim()) {
        const result = await parseInvoicesFromTextarea(chirieServerText, 'Cyber chirie server', 'chirieServerMonth', 'chirieServerYear');
        invoices.push(...result);
    }
    
    if (kycText.trim()) {
        const result = await parseInvoicesFromTextarea(kycText, 'Cyber chirie server', 'kycMonth', 'kycYear');
        invoices.push(...result);
    }
    
    if (vpnText.trim()) {
        const result = await parseInvoicesFromTextarea(vpnText, 'Cyber chirie server', 'vpnMonth', 'vpnYear');
        invoices.push(...result);
    }
    
    if (mentenantaText.trim()) {
        const result = await parseInvoicesFromTextarea(mentenantaText, 'Mentenanta module', 'mentenantaMonth', 'mentenantaYear');
        invoices.push(...result);
    }
    
    return invoices;
}

// Funcție veche pentru compatibilitate (dacă se folosește textarea-ul vechi)
function parseInvoicesDataOld(inputText) {
    const lines = inputText.split('\n').map(line => line.trim()).filter(line => line);
    const invoices = [];
    
    // Caută header-ul
    let headerFound = false;
    let headerIndex = -1;
    let dateIndex = -1;
    let descriptionIndex = -1;
    let amountIndex = -1;
    let locationIndex = -1;
    let departmentIndex = -1;
    let expenditureTypeIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split('\t').map(p => p.trim().toLowerCase());
        if (parts.some(p => p.includes('date') || p.includes('dată') || p.includes('explanation') || p.includes('denumire'))) {
            headerFound = true;
            headerIndex = i;
            parts.forEach((part, idx) => {
                if (part.includes('dată') || part.includes('date') || part.includes('data')) {
                    dateIndex = idx;
                } else if (part.includes('explanation') || part.includes('denumire') || part.includes('produs') || part.includes('serviciu') || part.includes('description')) {
                    descriptionIndex = idx;
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
    
    // Dacă nu găsește header, încearcă să parseze direct
    if (!headerFound) {
        headerIndex = -1;
        // Verifică dacă prima coloană este o dată (DD.MM.YYYY)
        const firstLine = lines[0] ? lines[0].split('\t').map(p => p.trim()) : [];
        if (firstLine.length > 0 && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(firstLine[0])) {
            // Format: Date | Explanation | Amount | Location | Department | Expenditure Type
            dateIndex = 0;
            descriptionIndex = 1;
            amountIndex = 2;
            if (firstLine.length >= 4) locationIndex = 3;
            if (firstLine.length >= 5) departmentIndex = 4;
            if (firstLine.length >= 6) expenditureTypeIndex = 5;
        } else if (firstLine.length >= 2) {
            // Verifică dacă prima coloană este un link
            if (firstLine[0].startsWith('http://') || firstLine[0].startsWith('https://')) {
                // Format: Link | Denumire | Sumă
                descriptionIndex = 1;
                amountIndex = 2;
            } else {
                // Format simplu: Denumire (cu lună) | Sumă
                descriptionIndex = 0;
                amountIndex = 1;
            }
        }
    }
    
    // Parsează facturile
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const parts = lines[i].split('\t').map(p => p.trim());
        if (parts.length < 2) continue;
        
        const dateStr = dateIndex !== -1 ? (parts[dateIndex] || '') : '';
        const description = descriptionIndex !== -1 ? (parts[descriptionIndex] || '') : '';
        const amountStr = amountIndex !== -1 ? (parts[amountIndex] || '') : '';
        const location = locationIndex !== -1 ? (parts[locationIndex] || '') : '';
        const department = departmentIndex !== -1 ? (parts[departmentIndex] || '') : '';
        const expenditureType = expenditureTypeIndex !== -1 ? (parts[expenditureTypeIndex] || '') : '';
        
        if (!amountStr || !description) continue;
        
        // Încearcă să extragă luna din denumirea produsului
        let monthYear = null;
        if (description) {
            monthYear = extractMonthFromText(description);
        }
        
        // Dacă nu găsește luna în denumire, folosește data
        let dateInfo = null;
        if (monthYear && monthYear.found) {
            // Folosește luna din denumire
            const dateFromInput = dateStr ? parseDate(dateStr) : null;
            if (dateFromInput) {
                dateInfo = {
                    day: dateFromInput.day,
                    month: monthYear.month,
                    year: monthYear.year || dateFromInput.year,
                    key: `${monthYear.year || dateFromInput.year}-${monthYear.month}`
                };
            } else {
                dateInfo = {
                    day: '01',
                    month: monthYear.month,
                    year: monthYear.year || '2025',
                    key: `${monthYear.year || '2025'}-${monthYear.month}`
                };
            }
        } else if (dateStr) {
            dateInfo = parseDate(dateStr);
        } else {
            // Dacă nu găsește nici luna, nici data, skip
            console.warn(`Nu s-a putut determina luna pentru: ${description}`);
            continue;
        }
        
        if (!dateInfo) continue;
        
        const amount = parseNumber(amountStr);
        if (amount === 0) continue;
        
        // Determină Expenditure Type pe baza denumirii dacă nu este specificat
        const finalExpenditureType = expenditureType || determineExpenditureType(description);
        
        // Dacă factura are deja locație, o păstrăm; altfel va fi distribuită
        invoices.push({
            serie: `CYB ${dateInfo.year}-${dateInfo.month}`,
            date: dateStr || generateDate(dateInfo.year, dateInfo.month),
            dateInfo: dateInfo,
            amount: amount,
            description: description,
            location: location,
            department: department || 'Servicii sistem informatic',
            expenditureType: finalExpenditureType
        });
    }
    
    return invoices;
}

// Funcție pentru a genera data în format DD.MM.YYYY (prima zi a lunii)
function generateDate(year, monthNum) {
    if (!year || !monthNum) return null;
    return `01.${monthNum}.${year}`;
}

// Funcție pentru a distribui o factură pe locații
function distributeInvoice(invoice) {
    const key = invoice.dateInfo.key;
    let monthSlots = slotsData[key];
    
    // Dacă nu există sloturi pentru anul specificat, încearcă să folosească sloturile din 2025
    if (!monthSlots && invoice.dateInfo.year === '2024') {
        const key2025 = `2025-${invoice.dateInfo.month}`;
        monthSlots = slotsData[key2025];
        if (monthSlots) {
            console.log(`Folosind sloturile din 2025 pentru ${key}`);
        }
    }
    
    if (!monthSlots) {
        console.warn(`Nu s-au găsit sloturi pentru ${key} sau pentru 2025-${invoice.dateInfo.month}`);
        return [];
    }
    
    // Calculează totalul de sloturi pentru luna respectivă
    const totalSlots = Object.values(monthSlots).reduce((sum, count) => sum + count, 0);
    
    if (totalSlots === 0) {
        console.warn(`Total sloturi este 0 pentru ${key}`);
        return [];
    }
    
    const results = [];
    
    // Dacă factura are deja locații specificate, păstrează-le
    if (invoice.location && invoice.location.trim() !== '') {
        // Factura este deja distribuită pe locații, doar o adaugăm
        results.push({
            date: invoice.date,
            explanation: invoice.description || `Factură Cyber ${invoice.serie}`,
            amount: formatNumber(invoice.amount),
            location: invoice.location,
            department: invoice.department || 'Servicii sistem informatic',
            expenditureType: invoice.expenditureType || 'Cyber chirie server'
        });
    } else {
        // Distribuie proporțional pe toate locațiile
        validLocations.forEach(location => {
            const slotCount = monthSlots[location] || 0;
            if (slotCount > 0) {
                const proportion = slotCount / totalSlots;
                const distributedAmount = invoice.amount * proportion;
                
                // Adaugă numărul de sloturi în explanation
                const explanationWithSlots = `${invoice.description || `Factură Cyber ${invoice.serie}`} (${slotCount} sloturi)`;
                
                results.push({
                    date: invoice.date,
                    explanation: explanationWithSlots,
                    amount: formatNumber(distributedAmount),
                    location: location,
                    department: invoice.department || 'Servicii sistem informatic',
                    expenditureType: invoice.expenditureType || 'Cyber chirie server'
                });
            }
        });
    }
    
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
    saveToLocalStorage('cyber_processedData', results);
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
    link.download = `facturi_cyber_distribuite_${new Date().toISOString().split('T')[0]}.csv`;
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
    const savedYear = loadFromLocalStorage('cyber_slotsYear');
    if (savedYear) {
        const yearSelect = document.getElementById('slotsYear');
        if (yearSelect) {
            yearSelect.value = savedYear;
        }
    }
    
    const savedSlots = loadFromLocalStorage('cyber_slotsData');
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
    
    const savedChirieServer = loadFromLocalStorage('cyber_chirieServerLinks');
    if (savedChirieServer) {
        document.getElementById('chirieServerLinks').value = savedChirieServer;
    }
    
    const savedKYC = loadFromLocalStorage('cyber_kycLinks');
    if (savedKYC) {
        document.getElementById('kycLinks').value = savedKYC;
    }
    
    const savedVPN = loadFromLocalStorage('cyber_vpnLinks');
    if (savedVPN) {
        document.getElementById('vpnLinks').value = savedVPN;
    }
    
    const savedMentenanta = loadFromLocalStorage('cyber_mentenantaLinks');
    if (savedMentenanta) {
        document.getElementById('mentenantaLinks').value = savedMentenanta;
    }
    
    // Încarcă selectorul comun
    const savedCommonMonth = loadFromLocalStorage('cyber_commonMonth');
    if (savedCommonMonth) {
        document.getElementById('commonMonth').value = savedCommonMonth;
    }
    const savedCommonYear = loadFromLocalStorage('cyber_commonYear');
    if (savedCommonYear) {
        document.getElementById('commonYear').value = savedCommonYear;
    }
    
    // Încearcă să parseze facturile salvate
    try {
        invoices = parseInvoicesData();
        if (invoices.length > 0) {
            const statusEl = document.getElementById('invoicesStatus');
            statusEl.textContent = `✓ Facturi importate: ${invoices.length}`;
            statusEl.className = 'status-message success';
            statusEl.style.display = 'block';
        }
    } catch (e) {
        console.warn('Eroare la încărcarea facturilor salvate:', e);
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
            saveToLocalStorage('cyber_slotsData', slotsInput.value);
        });
    }
    
    const chirieServerInput = document.getElementById('chirieServerLinks');
    if (chirieServerInput) {
        chirieServerInput.addEventListener('input', () => {
            saveToLocalStorage('cyber_chirieServerLinks', chirieServerInput.value);
        });
    }
    
    const kycInput = document.getElementById('kycLinks');
    if (kycInput) {
        kycInput.addEventListener('input', () => {
            saveToLocalStorage('cyber_kycLinks', kycInput.value);
        });
    }
    
    const vpnInput = document.getElementById('vpnLinks');
    if (vpnInput) {
        vpnInput.addEventListener('input', () => {
            saveToLocalStorage('cyber_vpnLinks', vpnInput.value);
        });
    }
    
    const mentenantaInput = document.getElementById('mentenantaLinks');
    if (mentenantaInput) {
        mentenantaInput.addEventListener('input', () => {
            saveToLocalStorage('cyber_mentenantaLinks', mentenantaInput.value);
        });
    }
    
    // Salvează selectorul comun
    const commonMonthSelect = document.getElementById('commonMonth');
    if (commonMonthSelect) {
        commonMonthSelect.addEventListener('change', () => {
            saveToLocalStorage('cyber_commonMonth', commonMonthSelect.value);
        });
    }
    const commonYearSelect = document.getElementById('commonYear');
    if (commonYearSelect) {
        commonYearSelect.addEventListener('change', () => {
            saveToLocalStorage('cyber_commonYear', commonYearSelect.value);
        });
    }
    
    const yearSelect = document.getElementById('slotsYear');
    if (yearSelect) {
        yearSelect.addEventListener('change', () => {
            saveToLocalStorage('cyber_slotsYear', yearSelect.value);
            // Re-parsează sloturile dacă există
            if (slotsInput && slotsInput.value.trim()) {
                try {
                    slotsData = parseSlotsData(slotsInput.value);
                    const statusEl = document.getElementById('slotsStatus');
                    statusEl.textContent = `✓ Sloturi importate: ${Object.keys(slotsData).length} luni`;
                    statusEl.className = 'status-message success';
                    statusEl.style.display = 'block';
                    
                    // Reprocesează dacă avem facturi
                    if (invoices.length > 0) {
                        processInvoices();
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
        saveToLocalStorage('cyber_slotsData', inputText);
        
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

document.getElementById('parseInvoicesBtn').addEventListener('click', async () => {
    const chirieServerText = document.getElementById('chirieServerLinks').value;
    const kycText = document.getElementById('kycLinks').value;
    const vpnText = document.getElementById('vpnLinks').value;
    const mentenantaText = document.getElementById('mentenantaLinks').value;
    
    if (!chirieServerText.trim() && !kycText.trim() && !vpnText.trim() && !mentenantaText.trim()) {
        alert('Te rugăm să introduci cel puțin un link sau date pentru facturi!');
        return;
    }
    
    const statusEl = document.getElementById('invoicesStatus');
    statusEl.textContent = '⏳ Extrag datele din link-uri...';
    statusEl.className = 'status-message';
    statusEl.style.display = 'block';
    
    try {
        invoices = await parseInvoicesData();
        statusEl.textContent = `✓ Facturi importate: ${invoices.length}`;
        statusEl.className = 'status-message success';
        
        // Salvează în localStorage
        saveToLocalStorage('cyber_chirieServerLinks', chirieServerText);
        saveToLocalStorage('cyber_kycLinks', kycText);
        saveToLocalStorage('cyber_vpnLinks', vpnText);
        saveToLocalStorage('cyber_mentenantaLinks', mentenantaText);
        
        // Salvează selectorul comun de lună/an
        saveToLocalStorage('cyber_commonMonth', document.getElementById('commonMonth').value);
        saveToLocalStorage('cyber_commonYear', document.getElementById('commonYear').value);
        
        // Dacă avem și sloturi, procesează
        if (Object.keys(slotsData).length > 0) {
            processInvoices();
        }
    } catch (error) {
        console.error('Eroare la parsare facturi:', error);
        statusEl.textContent = `✗ Eroare: ${error.message}`;
        statusEl.className = 'status-message error';
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

