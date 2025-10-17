/**
 * Formats Game Mix names by extracting only the mix name after " - "
 * Example: "EGT - Union" -> "Union"
 * @param {string} gameMixId - The game mix ID or name
 * @returns {string} - Formatted game mix name or 'N/A' if empty
 */
export const formatGameMixName = (gameMixId) => {
  if (!gameMixId) return 'N/A'
  
  // If it's already a clean name (no provider prefix), return as is
  if (!gameMixId.includes(' - ')) {
    return gameMixId
  }
  
  // Extract only the mix name after " - " (e.g., "EGT - Union" -> "Union")
  const parts = gameMixId.split(' - ')
  return parts.length > 1 ? parts[1] : gameMixId
}

/**
 * Gets Game Mix name from gameMixes array or formats the provided value
 * @param {string} gameMixId - The game mix ID or name
 * @param {Array} gameMixes - Array of game mix objects
 * @returns {string} - Formatted game mix name
 */
export const getGameMixName = (gameMixId, gameMixes = []) => {
  if (!gameMixId) return 'N/A'
  
  // First try to find in gameMixes array
  const gameMix = gameMixes.find(gm => gm.id === gameMixId || gm.name === gameMixId)
  if (gameMix) {
    return formatGameMixName(gameMix.name)
  }
  
  // If not found, format the provided value
  return formatGameMixName(gameMixId)
}
