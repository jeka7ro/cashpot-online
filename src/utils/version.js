import versionData from '../../version.json'

export const getVersion = () => {
  return versionData.version
}

export const getBuild = () => {
  // Afișăm numărul de build exact din version.json (stabil la build-time)
  return versionData.build
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

