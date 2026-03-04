import fs from 'fs';
import pdfParse from 'pdf-parse';

// Let's assume we read from a mocked buffer if we had one.
// We will just compile regexes to make sure they are robust.

const mockText = `
CERTIFICAT DE VERIFICARE TEHNICĂ
TECHNICAL INSPECTION CERTIFICATE
Cod verificare tehnică/ Inspection cod: ROM.SFX.1001.01#114
Certificat de verificare/ Inspection certificate: IC_ROM.SFX.1001.01#114
Serie mijloc de joc/ Serial number: 299724
An de fabricație/ Fabrication year: 2023
Producător/ Manufacturer: EURO GAMES TECHNOLOGY Ltd., BULGARIA
Aprobare de tip/ Type approval: RMC 0028/25
Emitent/ Issuer: Regio Metro Cert S.R.L.
Marca de autentificare/ Authentication mark: RMC-AT-001-0191831
Tip mijloc de joc/ Type of gaming device: VIDEO MULTIGAME - BELL LINK BOOST cu cabinet EGT-VS24
Nume program/ Software's name: BELL LINK BOOST
Cabinet / (Cabinet) : EGT-VS24
Data verificării/ Date of verification: 03.03.2025
Valabil până la (inclusiv)/ Valid until (including): 02.03.2026
`;

function parseText(text) {
  const getMatch = (regex, fallback = '') => {
    const match = text.match(regex);
    return match ? match[1].trim() : fallback;
  };

  return {
    cvt_number: getMatch(/Cod verificare tehnic[ăa]\/?\s*Inspection cod:\s*([^\n]+)/i),
    cvt_series: getMatch(/Certificat de verificare\/?\s*Inspection certificate:\s*([^\n]+)/i),
    serial_number: getMatch(/Serie mijloc de joc\/?\s*Serial number:\s*([^\n]+)/i),
    provider: getMatch(/Produc[ăa]tor\/?\s*Manufacturer:\s*([^\n]+)/i),
    approval_type: getMatch(/Aprobare de tip\/?\s*Type approval:\s*([^\n]+)/i),
    issuing_authority: getMatch(/Emitent\/?\s*Issuer:\s*([^\n]+)/i),
    software: getMatch(/Nume program\/?\s*Software's name:\s*([^\n]+)/i),
    cabinet: getMatch(/Cabinet\s*\/?\s*\(?Cabinet\)?\s*:\s*([^\n]+)/i),
    cvt_date: getMatch(/Data verific[ăa]rii\/?\s*Date of verification:\s*([^\n]+)/i),
    expiry_date: getMatch(/Valabil p[âa]n[ăa] la[^\:]*:\s*([^\n]+)/i)
  };
}

console.log(parseText(mockText));
