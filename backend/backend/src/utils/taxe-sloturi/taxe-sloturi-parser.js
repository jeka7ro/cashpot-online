/**
 * Modul reutilizabil pentru parsarea datelor de taxe sloturi
 * Poate fi importat în alte aplicații
 */

// Mapping lunilor în română și engleză
const monthMap = {
    'january': '01', 'ianuarie': '01',
    'february': '02', 'februarie': '02',
    'march': '03', 'martie': '03',
    'april': '04', 'aprilie': '04',
    'may': '05', 'mai': '05',
    'june': '06', 'iunie': '06',
    'july': '07', 'iulie': '07', 'iuliie': '07',
    'august': '08', 'august': '08',
    'september': '09', 'septembrie': '09',
    'october': '10', 'octombrie': '10',
    'november': '11', 'noiembrie': '11',
    'december': '12', 'decembrie': '12'
};

// Locații valide
const validLocations = ['Craiova', 'Pitesti', 'Ploiesti (centru)', 'Ploiesti (nord)', 'Valcea'];

// Funcție pentru a normaliza numerele (elimină punctele de mii)
function parseNumber(str) {
    if (!str || str.trim() === '') return 0;
    let cleaned = str.toString().trim().replace(/\s/g, '');
    
    if (cleaned.includes(',')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes('.')) {
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

// Funcție pentru a formata numele lunii
function formatMonthName(monthName) {
    if (!monthName) return '';
    const normalized = monthName.toLowerCase().trim();
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

// Funcție pentru a extrage Sheet ID din link-ul Google Sheets
function extractSheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
        return match[1];
    }
    return null;
}

// Funcție pentru a extrage GID din link
function extractGid(url) {
    const match = url.match(/[#&]gid=(\d+)/);
    if (match && match[1]) {
        return match[1];
    }
    return '0';
}

// Funcție pentru a încărca datele din Google Sheet
async function loadFromGoogleSheet(link) {
    const sheetId = extractSheetId(link);
    if (!sheetId) {
        throw new Error('Link-ul nu este valid. Te rugăm să folosești link-ul complet de la Google Sheets.');
    }
    
    const gid = extractGid(link);
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    
    try {
        const response = await fetch(exportUrl);
        if (!response.ok) {
            throw new Error('Nu s-au putut încărca datele. Verifică că sheet-ul este public sau că ai acces la el.');
        }
        
        const csvText = await response.text();
        const lines = csvText.split('\n');
        const tabSeparated = lines.map(line => {
            const values = line.split(',').map(val => val.trim().replace(/^"|"$/g, ''));
            return values.join('\t');
        }).join('\n');
        
        return tabSeparated;
    } catch (error) {
        console.error('Eroare la încărcarea datelor:', error);
        throw error;
    }
}

// Funcție principală pentru parsarea datelor
function parseTaxeSloturiData(inputText) {
    const lines = inputText.split('\n').map(line => line.trim()).filter(line => line);
    const results = [];
    
    let currentYear = null;
    let currentMonth = null;
    let currentMonthNum = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split('\t').map(p => p.trim());
        
        // Verifică dacă e rând cu an
        if (parts[0] && /^\d{4}$/.test(parts[0])) {
            currentYear = parts[0];
            continue;
        }
        
        // Verifică dacă e rând cu trimestru (Qtr)
        if (parts[0] && parts[0].toLowerCase().startsWith('qtr')) {
            continue;
        }
        
        // Verifică dacă e rând cu lună (poate conține și locație)
        const firstPart = parts[0] || '';
        const monthYearMatch = firstPart.match(/^([a-zăâîșț]+)\s+(\d{4})(?:\s+(.+))?$/i);
        if (monthYearMatch) {
            const monthName = monthYearMatch[1];
            const year = monthYearMatch[2];
            const possibleLocationInString = monthYearMatch[3] ? monthYearMatch[3].trim() : null;
            const monthNum = getMonthNumber(monthName);
            if (monthNum) {
                currentYear = year;
                currentMonth = monthName;
                currentMonthNum = monthNum;
                
                // Verifică dacă există locație în același string sau în coloana următoare
                let foundLocation = null;
                let locationIndex = -1;
                
                if (possibleLocationInString) {
                    for (const validLoc of validLocations) {
                        if (possibleLocationInString.toLowerCase().includes(validLoc.toLowerCase())) {
                            foundLocation = validLoc;
                            locationIndex = 0;
                            break;
                        }
                    }
                }
                
                if (!foundLocation && parts.length > 1) {
                    const secondPart = parts[1] || '';
                    for (const validLoc of validLocations) {
                        if (secondPart.toLowerCase().includes(validLoc.toLowerCase())) {
                            foundLocation = validLoc;
                            locationIndex = 1;
                            break;
                        }
                    }
                }
                
                // Dacă am găsit o locație, procesează rândul
                if (foundLocation) {
                    let slotCountIndex, autorizatiiIndex, viciuIndex, taxaAnualaIndex, taxaJocIndex;
                    
                    if (locationIndex === 0) {
                        slotCountIndex = 1;
                        autorizatiiIndex = 2;
                        viciuIndex = 3;
                        taxaAnualaIndex = 4;
                        taxaJocIndex = 5;
                    } else {
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
                    continue;
                } else {
                    continue;
                }
            }
        }
        
        // Verifică dacă e rând cu doar lună (fără an)
        let monthNum = getMonthNumber(firstPart);
        if (!monthNum && parts.length > 1) {
            monthNum = getMonthNumber(parts[1] || '');
        }
        if (monthNum) {
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
            
            if (!hasLocation) {
                currentMonth = firstPart;
                currentMonthNum = monthNum;
                if (!currentYear) {
                    for (let j = 1; j < parts.length; j++) {
                        if (parts[j] && /^\d{4}$/.test(parts[j])) {
                            currentYear = parts[j];
                            break;
                        }
                    }
                }
                continue;
            }
        }
        
        // Verifică dacă e rând cu "Total"
        if (firstPart.toLowerCase() === 'total' || (parts.length > 1 && parts[1] && parts[1].toLowerCase() === 'total')) {
            continue;
        }
        
        // Verifică dacă e rând cu locație
        let location = null;
        let slotCount = null;
        
        for (const validLoc of validLocations) {
            if (firstPart.toLowerCase().startsWith(validLoc.toLowerCase())) {
                location = validLoc;
                if (parts.length > 1) {
                    slotCount = parseNumber(parts[1] || '0');
                }
                break;
            }
        }
        
        if (!location && parts.length > 1) {
            const secondPart = parts[1] || '';
            for (const validLoc of validLocations) {
                if (secondPart.toLowerCase().startsWith(validLoc.toLowerCase())) {
                    location = validLoc;
                    if (parts.length > 2) {
                        slotCount = parseNumber(parts[2] || '0');
                    }
                    break;
                }
            }
        }
        
        if (location && validLocations.includes(location) && currentYear && currentMonthNum) {
            let autorizatiiIndex = 2;
            let viciuIndex = 3;
            let taxaAnualaIndex = 4;
            let taxaJocIndex = 5;
            
            if (parts[0] && !validLocations.some(loc => parts[0].toLowerCase().startsWith(loc.toLowerCase()))) {
                autorizatiiIndex = 3;
                viciuIndex = 4;
                taxaAnualaIndex = 5;
                taxaJocIndex = 6;
            }
            
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
        const parseDateForSort = (dateStr) => {
            const parts = dateStr.split('.');
            if (parts.length === 3) {
                return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
            return new Date(0);
        };
        
        const dateA = parseDateForSort(a.date);
        const dateB = parseDateForSort(b.date);
        const dateCompare = dateA.getTime() - dateB.getTime();
        
        if (dateCompare !== 0) return dateCompare;
        return a.location.localeCompare(b.location);
    });
    
    return results;
}

// Funcție pentru calcularea sumei totale
function calculateTotal(data) {
    let total = 0;
    data.forEach(row => {
        const amountStr = row.amount.toString().replace(/\./g, '').replace(',', '.');
        const amount = parseFloat(amountStr) || 0;
        total += amount;
    });
    return total;
}

// Export pentru utilizare în alte aplicații
if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = {
        parseTaxeSloturiData,
        loadFromGoogleSheet,
        calculateTotal,
        formatNumber,
        parseNumber
    };
} else if (typeof window !== 'undefined') {
    // Browser - adaugă la window object
    window.TaxeSloturiParser = {
        parseTaxeSloturiData,
        loadFromGoogleSheet,
        calculateTotal,
        formatNumber,
        parseNumber
    };
}

