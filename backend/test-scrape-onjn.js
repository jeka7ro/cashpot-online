import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

async function scrapeONJN() {
    try {
        const agent = new https.Agent({
            rejectUnauthorized: false
        });
        const response = await axios.get('https://onjn.gov.ro/structura-organizatorica/autorizare/', { httpsAgent: agent });
        const $ = cheerio.load(response.data);

        // The user provided screenshot shows a table: "Calendarul provizoriu al ședințelor Comitetului de Supraveghere"
        // Let's find all tables and print their text to find the right one
        $('table').each((i, table) => {
            const text = $(table).text();
            if (text.includes('Ianuarie') || text.includes('Februarie') || text.includes('Martie')) {
                console.log(`Found target table index: ${i}`);

                let currentYear = new Date().getFullYear(); // Assume current year or extract from text

                $(table).find('tr').each((j, row) => {
                    const cols = $(row).find('td, th');
                    if (cols.length >= 4) {
                        // Luna 1, Data 1, Luna 2, Data 2
                        const month1 = $(cols[0]).text().trim();
                        const dates1 = $(cols[1]).text().trim();
                        const month2 = $(cols[2]).text().trim();
                        const dates2 = $(cols[3]).text().trim();

                        console.log(`Row ${j}: ${month1} | ${dates1} | ${month2} | ${dates2}`);
                    }
                });
            }
        });

    } catch (err) {
        console.error('Error scraping:', err.message);
    }
}

scrapeONJN();
