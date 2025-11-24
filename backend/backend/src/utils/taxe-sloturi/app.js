// Mapping lunilor în română și engleză
const monthMap = {
    'january': '01', 'ianuarie': '01', 'ianuarie': '01',
    'february': '02', 'februarie': '02', 'februarie': '02',
    'march': '03', 'martie': '03', 'martie': '03',
    'april': '04', 'aprilie': '04', 'aprilie': '04',
    'may': '05', 'mai': '05', 'mai': '05',
    'june': '06', 'iunie': '06', 'iunie': '06',
    'july': '07', 'iulie': '07', 'iuliie': '07',
    'august': '08', 'august': '08', 'august': '08',
    'september': '09', 'septembrie': '09', 'septembrie': '09',
    'october': '10', 'octombrie': '10', 'octombrie': '10',
    'november': '11', 'noiembrie': '11', 'noiembrie': '11',
    'december': '12', 'decembrie': '12', 'decembrie': '12'
};

// Locații valide
const validLocations = ['Craiova', 'Pitesti', 'Ploiesti (centru)', 'Ploiesti (nord)', 'Valcea'];

// Funcție pentru a normaliza numerele (elimină punctele de mii)
function parseNumber(str) {
    if (!str || str.trim() === '') return 0;
    let cleaned = str.toString().trim().replace(/\s/g, '');
    
    // Dacă există virgulă, atunci virgula este separator zecimal și punctele sunt separatori de mii
    if (cleaned.includes(',')) {
        // Format românesc: 7.957.815,00 sau 79578,15
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes('.')) {
        // Dacă nu există virgulă, punctul este ÎNTOTDEAUNA separator de mii (nu zecimal)
        // Format: 171.383 sau 7.957.815 (punctul e separator de mii)
        cleaned = cleaned.replace(/\./g, '');
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

// Funcție pentru a formata numele lunii (prima literă mare)
function formatMonthName(monthName) {
    if (!monthName) return '';
    const normalized = monthName.toLowerCase().trim();
    // Mapping pentru numele lunilor în română
    const monthNames = {
        'ianuarie': 'Ianuarie', 'january': 'Ianuarie',
        'februarie': 'Februarie', 'february': 'Februarie',
        'martie': 'Martie', 'march': 'Martie',
        'aprilie': 'Aprilie', 'april': 'Aprilie',
        'mai': 'Mai', 'may': 'Mai',
        'iunie': 'Iunie', 'june': 'Iunie',
        'iulie': 'Iulie', 'iuliie': 'Iulie', 'july': 'Iulie',
        'august': 'August',
        'septembrie': 'Septembrie', 'september': 'Septembrie',
        'octombrie': 'Octombrie', 'october': 'Octombrie',
        'noiembrie': 'Noiembrie', 'november': 'Noiembrie',
        'decembrie': 'Decembrie', 'december': 'Decembrie'
    };
    return monthNames[normalized] || monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase();
}

// Funcție pentru a genera data în format DD.MM.YYYY
function generateDate(year, monthNum) {
    if (!year || !monthNum) return null;
    return `01.${monthNum}.${year}`;
}

// Funcție pentru a parsea datele din clipboard
function parseData(inputText) {
    const lines = inputText.split('\n').map(line => line.trim()).filter(line => line);
    const results = [];
    
    let currentYear = null;
    let currentMonth = null;
    let currentMonthNum = null;
    
    // Debug: tracking pentru noiembrie 2025
    let debugNoiembrie = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split('\t').map(p => p.trim());
        
        // Debug logging pentru noiembrie 2025
        if (line.toLowerCase().includes('noiembrie') && line.includes('2025')) {
            debugNoiembrie = true;
            console.log(`[DEBUG] Linia ${i}: "${line}" | Year: ${currentYear}, Month: ${currentMonth}, MonthNum: ${currentMonthNum}`);
            console.log(`[DEBUG] Linia ${i}: parts[0]="${parts[0]}", parts[1]="${parts[1] || ''}"`);
        }
        if (debugNoiembrie && parts[0] && validLocations.some(loc => parts[0].toLowerCase().includes(loc.toLowerCase()))) {
            console.log(`[DEBUG] Linia ${i} cu locație: "${line}" | Year: ${currentYear}, Month: ${currentMonth}, MonthNum: ${currentMonthNum}`);
        }
        
        // Verifică dacă e rând cu an
        if (parts[0] && /^\d{4}$/.test(parts[0])) {
            currentYear = parts[0];
            continue;
        }
        
        // Verifică dacă e rând cu trimestru (Qtr)
        if (parts[0] && parts[0].toLowerCase().startsWith('qtr')) {
            continue;
        }
        
        // Verifică dacă e rând cu lună (poate fi "January 2024", "ianuarie 2025", "martie 2025", etc.)
        const firstPart = parts[0] || '';
        // Încearcă să extragă luna și anul dintr-un string precum "January 2024" sau "ianuarie 2025"
        // Poate conține și locație: "octombrie 2025 Valcea" SAU locația poate fi în coloana următoare
        // IMPORTANT: Verifică mai întâi dacă parts[0] conține "lună an" (ex: "noiembrie 2025")
        // Regex-ul trebuie să match-uiască "noiembrie 2025" chiar dacă urmează TAB și apoi "Valcea"
        const monthYearMatch = firstPart.match(/^([a-zăâîșț]+)\s+(\d{4})(?:\s+(.+))?$/i);
        
        // Debug pentru noiembrie
        if (firstPart.toLowerCase().includes('noiembrie')) {
            console.log(`[DEBUG] Linia ${i}: firstPart="${firstPart}", monthYearMatch:`, monthYearMatch);
        }
        
        if (monthYearMatch) {
            const monthName = monthYearMatch[1];
            const year = monthYearMatch[2];
            const possibleLocationInString = monthYearMatch[3] ? monthYearMatch[3].trim() : null;
            const monthNum = getMonthNumber(monthName);
            
            if (firstPart.toLowerCase().includes('noiembrie')) {
                console.log(`[DEBUG] Linia ${i}: Regex match pentru "${firstPart}" -> monthName: "${monthName}", year: "${year}", monthNum: ${monthNum}, getMonthNumber("${monthName}"):`, getMonthNumber(monthName));
            }
            
            if (monthNum) {
                // SETEAZĂ LUNA ÎNTOTDEAUNA când găsește un match - chiar dacă există locație
                const oldMonth = currentMonth;
                const oldMonthNum = currentMonthNum;
                currentYear = year;
                currentMonth = monthName;
                currentMonthNum = monthNum;
                
                if (firstPart.toLowerCase().includes('noiembrie')) {
                    console.log(`[DEBUG] Linia ${i}: SETEZ luna de la "${oldMonth}" (${oldMonthNum}) la "${monthName}" (${monthNum}) pentru anul ${year}`);
                }
                
                // Verifică dacă locația este în același string SAU în coloana următoare
                let foundLocation = null;
                let locationIndex = -1;
                
                // Mai întâi verifică dacă locația este în același string
                if (possibleLocationInString) {
                    for (const validLoc of validLocations) {
                        if (possibleLocationInString.toLowerCase().includes(validLoc.toLowerCase())) {
                            foundLocation = validLoc;
                            locationIndex = 0; // Locația e în același string cu luna
                            break;
                        }
                    }
                }
                
                // Dacă nu am găsit în string, verifică dacă coloana următoare (parts[1]) este o locație
                if (!foundLocation && parts.length > 1) {
                    const secondPart = parts[1] || '';
                    for (const validLoc of validLocations) {
                        if (secondPart.toLowerCase().includes(validLoc.toLowerCase())) {
                            foundLocation = validLoc;
                            locationIndex = 1; // Locația e în coloana 1
                            break;
                        }
                    }
                }
                
                // Dacă am găsit o locație, procesează rândul
                if (foundLocation) {
                    // Determină indexurile corecte pentru date
                    let slotCountIndex, autorizatiiIndex, viciuIndex, taxaAnualaIndex, taxaJocIndex;
                    
                    if (locationIndex === 0) {
                        // Locația e în același string cu luna: "octombrie 2025 Valcea"
                        // Format: [0]="octombrie 2025 Valcea", [1]=Buc, [2]=Autorizatii, etc.
                        slotCountIndex = 1;
                        autorizatiiIndex = 2;
                        viciuIndex = 3;
                        taxaAnualaIndex = 4;
                        taxaJocIndex = 5;
                    } else {
                        // Locația e în coloana 1: [0]="octombrie 2025", [1]="Valcea", [2]=Buc, [3]=Autorizatii, etc.
                        slotCountIndex = 2;
                        autorizatiiIndex = 3;
                        viciuIndex = 4;
                        taxaAnualaIndex = 5;
                        taxaJocIndex = 6;
                    }
                    
                    const slotCount = parseNumber(parts[slotCountIndex] || '0');
                    const autorizatii = parseNumber(parts[autorizatiiIndex] || '0');
                    const viciu = parseNumber(parts[viciuIndex] || '0');
                    const taxaAnuala = parseNumber(parts[taxaAnualaIndex] || '0');
                    const taxaJoc = parseNumber(parts[taxaJocIndex] || '0');
                    
                    const date = generateDate(currentYear, currentMonthNum);
                    const monthNameFormatted = formatMonthName(currentMonth);
                    const monthYear = monthNameFormatted && currentYear ? ` ${monthNameFormatted} ${currentYear}` : '';
                    const slotSuffix = (slotCount !== null && slotCount > 0) ? ` (${slotCount} sloturi)` : '';
                    
                    if (autorizatii > 0) {
                        results.push({
                            date: date,
                            explanation: `Autorizatii lunare${monthYear}${slotSuffix}`,
                            amount: formatNumber(autorizatii),
                            location: foundLocation,
                            department: 'Taxe Sloturi',
                            expenditureType: 'Autorizatii lunare'
                        });
                    }
                    if (viciu > 0) {
                        results.push({
                            date: date,
                            explanation: `Taxe viciu sloturi${monthYear}${slotSuffix}`,
                            amount: formatNumber(viciu),
                            location: foundLocation,
                            department: 'Taxe Sloturi',
                            expenditureType: 'Viciu lunare'
                        });
                    }
                    if (taxaAnuala > 0) {
                        results.push({
                            date: date,
                            explanation: `Taxa anula lunara${monthYear}${slotSuffix}`,
                            amount: formatNumber(taxaAnuala),
                            location: foundLocation,
                            department: 'Taxe Sloturi',
                            expenditureType: 'Taxa anula lunara'
                        });
                    }
                    if (taxaJoc > 0) {
                        results.push({
                            date: date,
                            explanation: `Taxe joc responsabil${monthYear}${slotSuffix}`,
                            amount: formatNumber(taxaJoc),
                            location: foundLocation,
                            department: 'Taxe Sloturi',
                            expenditureType: 'Taxe joc responsabil'
                        });
                    }
                    // IMPORTANT: După ce procesează o locație, face continue pentru a trece la următorul rând
                    // Luna rămâne setată (currentYear, currentMonth, currentMonthNum), deci rândurile următoare
                    // cu locații vor fi procesate pentru aceeași lună
                    continue;
                } else {
                    // Dacă nu are locație, doar setează luna și continuă (pentru rânduri cu doar "noiembrie 2025")
                    continue;
                }
            }
        }
        
        // Verifică dacă e rând cu doar lună (fără an) - poate fi în prima sau a doua coloană
        // DAR NU procesa ca lună dacă există deja o locație în coloana următoare (ex: "noiembrie 2025" + coloana 1 = "Valcea")
        let monthNum = getMonthNumber(firstPart);
        if (!monthNum && parts.length > 1) {
            monthNum = getMonthNumber(parts[1] || '');
        }
        if (monthNum) {
            // Verifică dacă coloana următoare (parts[1]) este o locație
            let hasLocation = false;
            if (parts.length > 1) {
                const secondPart = parts[1] || '';
                for (const validLoc of validLocations) {
                    if (secondPart.toLowerCase().includes(validLoc.toLowerCase())) {
                        hasLocation = true;
                        break;
                    }
                }
            }
            
            // Dacă nu are locație în coloana următoare, procesează ca lună normală
            if (!hasLocation) {
                currentMonth = firstPart;
                currentMonthNum = monthNum;
                // Dacă nu avem an, încearcă să-l extragă din următoarele părți sau folosește ultimul an găsit
                if (!currentYear) {
                    // Caută an în restul părților
                    for (let j = 1; j < parts.length; j++) {
                        if (parts[j] && /^\d{4}$/.test(parts[j])) {
                            currentYear = parts[j];
                            break;
                        }
                    }
                }
                continue;
            }
            // Dacă are locație în coloana următoare, nu face continue - lasă să fie procesat ca rând cu locație mai jos
        }
        
        // Verifică dacă e rând cu "Total" (skip) - poate fi în prima sau a doua coloană
        // IMPORTANT: Nu reseta luna când găsești "Total" - luna trebuie să rămână setată
        // pentru ca rândurile următoare cu locații să fie procesate pentru aceeași lună
        if (firstPart.toLowerCase() === 'total' || (parts.length > 1 && parts[1] && parts[1].toLowerCase() === 'total')) {
            if (debugNoiembrie) {
                console.log(`[DEBUG] Linia ${i}: "Total" - Skip dar păstrez luna: Year: ${currentYear}, Month: ${currentMonth}, MonthNum: ${currentMonthNum}`);
            }
            continue; // Skip "Total" dar păstrează luna setată
        }
        
        // Verifică dacă e rând cu locație
        // În formatul nou: coloana 0 = locația, coloana 1 = Buc (numărul de sloturi)
        let location = null;
        let slotCount = null;
        
        // Verifică dacă prima coloană este o locație validă
        for (const validLoc of validLocations) {
            if (firstPart.toLowerCase().startsWith(validLoc.toLowerCase())) {
                location = validLoc;
                // Numărul de sloturi este în coloana 1 (Buc)
                if (parts.length > 1) {
                    slotCount = parseNumber(parts[1] || '0');
                }
                break;
            }
        }
        
        // Dacă nu e locație în prima coloană, verifică dacă e în a doua (cazuri speciale)
        if (!location && parts.length > 1) {
            const secondPart = parts[1] || '';
            for (const validLoc of validLocations) {
                if (secondPart.toLowerCase().startsWith(validLoc.toLowerCase())) {
                    location = validLoc;
                    // Numărul de sloturi ar putea fi în coloana 2 sau 3
                    if (parts.length > 2) {
                        slotCount = parseNumber(parts[2] || '0');
                    }
                    break;
                }
            }
        }
        
        // Debug: log pentru locații găsite
        if (location && debugNoiembrie) {
            console.log(`[DEBUG] Linia ${i}: Locație găsită "${location}" | Year: ${currentYear}, Month: ${currentMonth}, MonthNum: ${currentMonthNum}`);
        }
        
        if (location && validLocations.includes(location)) {
            // Debug: verifică dacă luna este setată
            if (!currentYear || !currentMonthNum) {
                if (debugNoiembrie || location === 'Craiova' || location === 'Pitesti') {
                    console.log(`[DEBUG] Locație găsită "${location}" dar luna nu este setată! Year: ${currentYear}, Month: ${currentMonth}, MonthNum: ${currentMonthNum} | Linia: "${line}"`);
                }
                // Dacă luna nu este setată, skip acest rând
                continue;
            }
            
            // Debug pentru noiembrie
            if (currentMonthNum === '11' && (location === 'Craiova' || location === 'Pitesti' || location === 'Ploiesti (centru)' || location === 'Ploiesti (nord)')) {
                console.log(`[DEBUG] Procesez locația "${location}" pentru noiembrie 2025`);
            }
            
            // În formatul nou, coloanele sunt:
            // 0: Locatie
            // 1: Buc (numărul de sloturi) - deja extras mai sus
            // 2: Autorizatii
            // 3: Viciu
            // 4: Taxa Anuala
            // 5: Taxa Joc
            
            let autorizatiiIndex = 2;
            let viciuIndex = 3;
            let taxaAnualaIndex = 4;
            let taxaJocIndex = 5;
            
            // Dacă locația e în coloana 1 (nu în 0), ajustează indexurile
            if (parts[0] && !validLocations.some(loc => parts[0].toLowerCase().startsWith(loc.toLowerCase()))) {
                autorizatiiIndex = 3;
                viciuIndex = 4;
                taxaAnualaIndex = 5;
                taxaJocIndex = 6;
            }
            
            if (debugNoiembrie) {
                console.log(`[DEBUG] Procesez locația "${location}" pentru ${currentMonth} ${currentYear}`);
            }
            
            const autorizatii = parseNumber(parts[autorizatiiIndex] || '0');
            const viciu = parseNumber(parts[viciuIndex] || '0');
            const taxaAnuala = parseNumber(parts[taxaAnualaIndex] || '0');
            const taxaJoc = parseNumber(parts[taxaJocIndex] || '0');
            
            const date = generateDate(currentYear, currentMonthNum);
            
            // Formatează numele lunii
            const monthNameFormatted = formatMonthName(currentMonth);
            const monthYear = monthNameFormatted && currentYear ? ` ${monthNameFormatted} ${currentYear}` : '';
            
            // Creează sufixul cu numărul de sloturi
            const slotSuffix = (slotCount !== null && slotCount > 0) ? ` (${slotCount} sloturi)` : '';
            
            // Creează rânduri separate pentru fiecare tip de cheltuială
            if (autorizatii > 0) {
                results.push({
                    date: date,
                    explanation: `Autorizatii lunare${monthYear}${slotSuffix}`,
                    amount: formatNumber(autorizatii),
                    location: location,
                    department: 'Taxe Sloturi',
                    expenditureType: 'Autorizatii lunare'
                });
            }
            
            if (viciu > 0) {
                results.push({
                    date: date,
                    explanation: `Taxe viciu sloturi${monthYear}${slotSuffix}`,
                    amount: formatNumber(viciu),
                    location: location,
                    department: 'Taxe Sloturi',
                    expenditureType: 'Viciu lunare'
                });
            }
            
            if (taxaAnuala > 0) {
                results.push({
                    date: date,
                    explanation: `Taxa anula lunara${monthYear}${slotSuffix}`,
                    amount: formatNumber(taxaAnuala),
                    location: location,
                    department: 'Taxe Sloturi',
                    expenditureType: 'Taxa anula lunara'
                });
            }
            
            if (taxaJoc > 0) {
                results.push({
                    date: date,
                    explanation: `Taxe joc responsabil${monthYear}${slotSuffix}`,
                    amount: formatNumber(taxaJoc),
                    location: location,
                    department: 'Taxe Sloturi',
                    expenditureType: 'Taxe joc responsabil'
                });
            }
        }
    }
    
    // Sortează după dată (crescător) și apoi după locație
    results.sort((a, b) => {
        // Convertește datele din format "DD.MM.YYYY" pentru sortare corectă
        const parseDateForSort = (dateStr) => {
            const parts = dateStr.split('.');
            if (parts.length === 3) {
                return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
            return new Date(0); // Fallback pentru date invalide
        };
        
        const dateA = parseDateForSort(a.date);
        const dateB = parseDateForSort(b.date);
        const dateCompare = dateA.getTime() - dateB.getTime();
        
        if (dateCompare !== 0) return dateCompare;
        return a.location.localeCompare(b.location);
    });
    
    return results;
}

// Funcție pentru a calcula suma totală
function calculateTotal(data) {
    let total = 0;
    data.forEach(row => {
        // Convertește suma din format "123.456,78" în număr
        const amountStr = row.amount.toString().replace(/\./g, '').replace(',', '.');
        const amount = parseFloat(amountStr) || 0;
        total += amount;
    });
    return total;
}

// Funcție pentru a crea tabelul centralizator
function createSummaryTable(data) {
    const summaryBody = document.getElementById('summaryBody');
    summaryBody.innerHTML = '';
    
    // Grupează datele pe lună și locație
    const summary = {}; // { '2025-11': { 'Craiova': { buc: 79, autorizatii: 196540, viciu: 32759, ... }, ... }, ... }
    
    data.forEach(row => {
        // Extrage luna și anul din dată (format: DD.MM.YYYY)
        const dateParts = row.date.split('.');
        if (dateParts.length !== 3) return;
        
        const year = dateParts[2];
        const month = dateParts[1];
        const key = `${year}-${month}`;
        const location = row.location;
        
        if (!summary[key]) {
            summary[key] = {};
        }
        if (!summary[key][location]) {
            summary[key][location] = {
                buc: 0,
                autorizatii: 0,
                viciu: 0,
                taxaAnuala: 0,
                taxaJoc: 0
            };
        }
        
        // Extrage numărul de sloturi din explanation
        const slotMatch = row.explanation.match(/\((\d+)\s+sloturi\)/);
        if (slotMatch && summary[key][location].buc === 0) {
            summary[key][location].buc = parseInt(slotMatch[1], 10);
        }
        
        // Adaugă sumele pe tip de cheltuială
        const amount = parseNumber(row.amount);
        if (row.expenditureType === 'Autorizatii lunare') {
            summary[key][location].autorizatii += amount;
        } else if (row.expenditureType === 'Viciu lunare') {
            summary[key][location].viciu += amount;
        } else if (row.expenditureType === 'Taxa anula lunara') {
            summary[key][location].taxaAnuala += amount;
        } else if (row.expenditureType === 'Taxe joc responsabil') {
            summary[key][location].taxaJoc += amount;
        }
    });
    
    // Sortează cheile (luni)
    const sortedKeys = Object.keys(summary).sort();
    
    // Numele lunilor
    const monthNames = {
        '01': 'Ianuarie', '02': 'Februarie', '03': 'Martie', '04': 'Aprilie',
        '05': 'Mai', '06': 'Iunie', '07': 'Iulie', '08': 'August',
        '09': 'Septembrie', '10': 'Octombrie', '11': 'Noiembrie', '12': 'Decembrie'
    };
    
    sortedKeys.forEach(key => {
        const [year, month] = key.split('-');
        const monthName = monthNames[month] || month;
        const locations = Object.keys(summary[key]).sort();
        
        locations.forEach(location => {
            const locData = summary[key][location];
            const total = locData.autorizatii + locData.viciu + locData.taxaAnuala + locData.taxaJoc;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 8px;">${monthName} ${year}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${location}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${locData.buc || ''}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatNumber(locData.autorizatii)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatNumber(locData.viciu)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatNumber(locData.taxaAnuala)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatNumber(locData.taxaJoc)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${formatNumber(total)}</td>
            `;
            summaryBody.appendChild(tr);
        });
    });
}

// Funcție pentru a afișa preview
function displayPreview(data) {
    const tbody = document.getElementById('previewBody');
    tbody.innerHTML = '';
    
    document.getElementById('rowCount').textContent = data.length;
    
    // Calculează suma totală
    const total = calculateTotal(data);
    document.getElementById('totalAmount').textContent = formatNumber(total);
    
    // Creează tabelul centralizator
    createSummaryTable(data);
    
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
    link.download = `centralizator_taxe_sloturi_${new Date().toISOString().split('T')[0]}.csv`;
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

// Funcție pentru a comuta între metodele de import
function toggleImportMethod() {
    const method = document.querySelector('input[name="importMethod"]:checked').value;
    const manualDiv = document.getElementById('manualImport');
    const linkDiv = document.getElementById('linkImport');
    
    if (method === 'manual') {
        manualDiv.style.display = 'block';
        linkDiv.style.display = 'none';
    } else {
        manualDiv.style.display = 'none';
        linkDiv.style.display = 'block';
    }
}

// Funcție pentru a extrage Sheet ID din link-ul Google Sheets
function extractSheetId(url) {
    // Format: https://docs.google.com/spreadsheets/d/SHEET_ID/edit
    // Sau: https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
        return match[1];
    }
    return null;
}

// Funcție pentru a extrage GID din link (dacă există)
function extractGid(url) {
    const match = url.match(/[#&]gid=(\d+)/);
    if (match && match[1]) {
        return match[1];
    }
    return '0'; // Default la primul sheet
}

// Funcție pentru a încărca datele din Google Sheet
async function loadFromGoogleSheet(link) {
    const sheetId = extractSheetId(link);
    if (!sheetId) {
        throw new Error('Link-ul nu este valid. Te rugăm să folosești link-ul complet de la Google Sheets.');
    }
    
    const gid = extractGid(link);
    // Construiește link-ul pentru export CSV
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    
    try {
        const response = await fetch(exportUrl);
        if (!response.ok) {
            throw new Error('Nu s-au putut încărca datele. Verifică că sheet-ul este public sau că ai acces la el.');
        }
        
        const csvText = await response.text();
        // Convertește CSV în format tab-separated (similar cu copierea din Google Sheets)
        const lines = csvText.split('\n');
        const tabSeparated = lines.map(line => {
            // Parsează CSV (simplificat - pentru virgule în valori, ar trebui un parser CSV mai complex)
            const values = line.split(',').map(val => val.trim().replace(/^"|"$/g, ''));
            return values.join('\t');
        }).join('\n');
        
        return tabSeparated;
    } catch (error) {
        console.error('Eroare la încărcarea datelor:', error);
        throw error;
    }
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
    const savedInput = loadFromLocalStorage('transformare_inputData');
    if (savedInput) {
        document.getElementById('inputData').value = savedInput;
    }
    
    const savedLink = loadFromLocalStorage('transformare_sheetLink');
    if (savedLink) {
        document.getElementById('sheetLink').value = savedLink;
    }
    
    const savedParsedData = loadFromLocalStorage('transformare_parsedData');
    if (savedParsedData && savedParsedData.length > 0) {
        displayPreview(savedParsedData);
        window.parsedData = savedParsedData;
    }
});

// Salvează automat când se modifică input-ul
document.addEventListener('DOMContentLoaded', () => {
    const inputData = document.getElementById('inputData');
    if (inputData) {
        inputData.addEventListener('input', () => {
            saveToLocalStorage('transformare_inputData', inputData.value);
        });
    }
});

// Event listeners
document.getElementById('loadFromLinkBtn').addEventListener('click', async () => {
    const link = document.getElementById('sheetLink').value.trim();
    const statusDiv = document.getElementById('linkStatus');
    
    if (!link) {
        statusDiv.textContent = 'Te rugăm să introduci un link!';
        statusDiv.style.display = 'block';
        statusDiv.style.backgroundColor = '#ffebee';
        statusDiv.style.color = '#c62828';
        return;
    }
    
    statusDiv.textContent = '⏳ Se încarcă datele...';
    statusDiv.style.display = 'block';
    statusDiv.style.backgroundColor = '#e3f2fd';
    statusDiv.style.color = '#1565c0';
    
    try {
        const data = await loadFromGoogleSheet(link);
        document.getElementById('inputData').value = data;
        statusDiv.textContent = '✓ Datele au fost încărcate cu succes!';
        statusDiv.style.backgroundColor = '#e8f5e9';
        statusDiv.style.color = '#2e7d32';
        
        // Salvează link-ul
        saveToLocalStorage('transformare_sheetLink', link);
    } catch (error) {
        statusDiv.textContent = `✗ Eroare: ${error.message}`;
        statusDiv.style.backgroundColor = '#ffebee';
        statusDiv.style.color = '#c62828';
    }
});

document.getElementById('parseBtn').addEventListener('click', () => {
    const inputText = document.getElementById('inputData').value;
    if (!inputText.trim()) {
        alert('Te rugăm să lipești datele sau să încarci datele din link mai întâi!');
        return;
    }
    
    try {
        const parsedData = parseData(inputText);
        console.log('Date parsate:', parsedData.length, 'rânduri');
        if (parsedData.length === 0) {
            // Verifică dacă există date în input
            const lines = inputText.split('\n').filter(line => line.trim());
            console.log('Linii în input:', lines.length);
            if (lines.length === 0) {
                alert('Te rugăm să lipești datele mai întâi!');
                return;
            }
            alert('Nu s-au găsit date valide. Verifică formatul datelor copiate.\n\nFormat așteptat:\n- Rând cu an (ex: 2025)\n- Rând cu lună (ex: ianuarie sau ianuarie 2025)\n- Rânduri cu locații (ex: Craiova, Pitesti, etc.) urmate de coloane cu sume');
            return;
        }
        
        // Calculează suma totală pentru mesaj
        const total = calculateTotal(parsedData);
        
        displayPreview(parsedData);
        window.parsedData = parsedData; // Salvează pentru export
        
        // Salvează în localStorage
        saveToLocalStorage('transformare_inputData', inputText);
        saveToLocalStorage('transformare_parsedData', parsedData);
        
        // Mesaj de succes
        alert(`✓ Parsare finalizată cu succes!\n\n${parsedData.length} rânduri procesate\nSuma totală: ${formatNumber(total)} RON`);
    } catch (error) {
        console.error('Eroare la parsare:', error);
        alert('Eroare la parsarea datelor: ' + error.message);
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

