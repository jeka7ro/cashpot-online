import versionData from '../../version.json'

// Variabilă locală pentru a urmări numărul de build în sesiunea curentă
let currentBuild = versionData.build

// Incrementăm build-ul la fiecare import al fișierului (refresh)
currentBuild++

export const getVersion = () => {
  return versionData.version
}

export const getBuild = () => {
  return currentBuild
}

export const getBuildDate = () => {
  // Folosim data din version.json (ora reală a build-ului)
  const buildDate = new Date(versionData.buildDate)
  const day = String(buildDate.getDate()).padStart(2, '0')
  const month = String(buildDate.getMonth() + 1).padStart(2, '0')
  const year = buildDate.getFullYear()
  const hours = String(buildDate.getHours()).padStart(2, '0')
  const minutes = String(buildDate.getMinutes()).padStart(2, '0')
  
  return `${day}.${month}.${year} - ${hours}:${minutes}`
}

export const getFullVersion = () => {
  return `v${getVersion()} - Build #${getBuild()} - ${getBuildDate()}`
}

