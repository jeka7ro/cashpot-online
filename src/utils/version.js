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
  // Folosim data și ora curentă în loc de cea din version.json
  const date = new Date()
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${day}.${month}.${year} - ${hours}:${minutes}`
}

export const getFullVersion = () => {
  return `v${getVersion()} - Build #${getBuild()} - ${getBuildDate()}`
}

