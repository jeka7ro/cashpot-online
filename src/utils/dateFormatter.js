// Utility function for formatting dates consistently
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  
  const date = new Date(dateString)
  
  // Format as: DD.MM.YYYY HH:MM
  return date.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format date only (without time)
export const formatDateOnly = (dateString) => {
  if (!dateString) return 'N/A'
  
  const date = new Date(dateString)
  
  // Format as: DD.MM.YYYY
  return date.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Format time only
export const formatTimeOnly = (dateString) => {
  if (!dateString) return 'N/A'
  
  const date = new Date(dateString)
  
  // Format as: HH:MM
  return date.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit'
  })
}










