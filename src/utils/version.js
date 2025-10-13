import versionData from '../../version.json'

export const getVersion = () => {
  return versionData.version
}

export const getBuild = () => {
  return versionData.build
}

export const getBuildDate = () => {
  const date = new Date(versionData.buildDate)
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

