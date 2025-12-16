/**
 * Test pentru export Excel
 */

import XLSX from 'xlsx'

console.log('🔍 Test XLSX...')

try {
  const workbook = XLSX.utils.book_new()
  
  const data = [
    ['Test', 'Data'],
    ['Row 1', '123']
  ]
  
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Test')
  
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  
  console.log('✅ XLSX works! Buffer size:', buffer.length)
  
} catch (error) {
  console.error('❌ XLSX error:', error)
}











