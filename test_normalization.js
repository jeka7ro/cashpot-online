
const normalizeLocationName = (name) => {
    if (!name) return ''
    let n = name.toString().trim()
    // Elimină sufixe de tip E.S / E.S. / ES / E.S / E.S. (cu sau fără puncte, cu sau fără spații)
    n = n.replace(/\s*E\.?\s*S\.?\s*$/i, '')
    // Elimină și alte variante posibile
    n = n.replace(/\s*ES\s*$/i, '')

    // ROBUST: Lowercase and strip accents to match Expenditures logic
    n = n.replace(/ţ/g, 'ț').replace(/ş/g, 'ș')
        .replace(/Ţ/g, 'Ț').replace(/Ş/g, 'Ș')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

    return n.trim()
}

const inputs = [
    "Craiova",
    "Craiova E.S",
    "Craiova E.S.",
    "Pitesti",
    "Pitesti E.S",
    "Ploiesti (nord)",
    "Ploiesti (nord) E.S",
    "Valcea",
    "Valcea E.S"
];

console.log("Original -> Normalized");
inputs.forEach(input => {
    console.log(`"${input}" -> "${normalizeLocationName(input)}"`);
});
