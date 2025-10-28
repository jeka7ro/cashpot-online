// Lightweight Romanian population dataset (approximate, 2021-2023 order of magnitude)

export const countyPopulation = {
  București: 1716000,
  Ilfov: 550000,
  Cluj: 736000,
  Iași: 770000,
  Timiș: 760000,
  Constanța: 680000,
  Prahova: 730000,
  Suceava: 760000,
  Bacău: 616000,
  Brașov: 550000,
  Dolj: 660000,
  Galați: 620000,
  Argeș: 620000,
  Bihor: 600000,
  Mureș: 540000,
  Sibiu: 400000,
  Botoșani: 390000,
  Dâmbovița: 510000,
  Hunedoara: 390000,
  Neamț: 470000,
  Maramureș: 450000,
  Buzău: 450000,
  Vaslui: 375000,
  Arad: 460000,
  Alba: 330000,
  Vâlcea: 355000,
  Olt: 430000,
  Satu\u00a0Mare: 340000,
  Caraș-Severin: 265000,
  Mehedinți: 240000,
  Harghita: 310000,
  Covasna: 200000,
  Sălaj: 210000,
  Brăila: 330000,
  Vrancea: 320000,
  Tulcea: 195000,
  Ialomița: 245000,
  Călărași: 285000,
  Giurgiu: 250000,
  Teleorman: 330000,
  Bistrița-Năsăud: 280000
}

export const cityPopulation = {
  'București': 1716000,
  'Cluj-Napoca': 286000,
  'Iași': 318000,
  'Timișoara': 250000,
  'Constanța': 280000,
  'Brașov': 250000,
  'Craiova': 270000,
  'Galați': 250000,
  'Ploiești': 200000,
  'Oradea': 220000,
  'Arad': 160000,
  'Sibiu': 170000,
  'Bacău': 150000,
  'Pitești': 150000,
  'Suceava': 120000
}

export const getCountyPopulation = (countyRaw) => {
  if (!countyRaw) return undefined
  // Remove leading "Județul/JUDEȚUL"
  const county = countyRaw.replace(/^JUD[EȚ]UL\s+/i, '').trim()
  return countyPopulation[county]
}

export const getCityPopulation = (cityRaw) => {
  if (!cityRaw) return undefined
  const city = cityRaw.trim()
  return cityPopulation[city]
}

export const formatNumber = (n) => (typeof n === 'number' ? n.toLocaleString('ro-RO') : '-')


