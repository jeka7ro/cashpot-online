const fs = require('fs')
const path = require('path')

// Lista de fișiere care conțin confirm()
const filesToUpdate = [
  'src/pages/Slots.jsx',
  'src/pages/SlotDetail.jsx',
  'src/pages/SlotDetail_fixed.jsx',
  'src/pages/Providers.jsx',
  'src/pages/Cabinets.jsx',
  'src/pages/Locations.jsx',
  'src/pages/GameMixes.jsx',
  'src/pages/Users.jsx',
  'src/pages/Metrology.jsx',
  'src/pages/Jackpots.jsx',
  'src/pages/Invoices.jsx',
  'src/pages/LegalDocuments.jsx',
  'src/pages/SlotDetail_backup.jsx',
  'src/components/modals/MetrologyModal.jsx',
  'src/components/modals/CompanyModal.jsx',
  'src/components/modals/ContractModal.jsx',
  'src/components/LocationProprietari.jsx',
  'src/components/LocationContracts.jsx',
  'src/pages/CompanyDetail.jsx',
  'src/pages/Settings.jsx'
]

// Funcție pentru a adăuga importurile necesare
function addImports(content) {
  if (content.includes('import ConfirmModal') && content.includes('import useConfirm')) {
    return content // Already has imports
  }

  // Find the last import statement
  const importRegex = /import.*from.*['"][^'"]+['"];?\s*$/gm
  const imports = content.match(importRegex) || []
  const lastImport = imports[imports.length - 1]
  
  if (lastImport) {
    const lastImportIndex = content.lastIndexOf(lastImport) + lastImport.length
    const newImports = `
import ConfirmModal from '../components/modals/ConfirmModal'
import useConfirm from '../hooks/useConfirm'`
    
    return content.slice(0, lastImportIndex) + newImports + content.slice(lastImportIndex)
  }
  
  return content
}

// Funcție pentru a adăuga hook-ul de confirmare
function addConfirmHook(content) {
  if (content.includes('const { confirmState, confirm, close } = useConfirm()')) {
    return content // Already has hook
  }

  // Find the component function start
  const componentMatch = content.match(/(const\s+\w+\s*=\s*\(\)\s*=>\s*{|function\s+\w+\s*\(\)\s*{)/)
  if (componentMatch) {
    const hookIndex = componentMatch.index + componentMatch[0].length
    const newHook = `
  const { confirmState, confirm, close } = useConfirm()
`
    return content.slice(0, hookIndex) + newHook + content.slice(hookIndex)
  }
  
  return content
}

// Funcție pentru a înlocui confirm() cu hook-ul custom
function replaceConfirms(content) {
  // Replace window.confirm patterns
  content = content.replace(
    /if\s*\(\s*window\.confirm\s*\(\s*([^)]+)\s*\)\s*\)\s*{([^}]+)}/g,
    (match, confirmMessage, codeBlock) => {
      const cleanMessage = confirmMessage.replace(/^['"`]|['"`]$/g, '')
      return `const confirmed = await confirm({
      title: 'Confirmare',
      message: ${confirmMessage},
      type: 'danger'
    })
    if (confirmed) {${codeBlock}}`
    }
  )

  // Replace alert() patterns
  content = content.replace(
    /alert\s*\(\s*([^)]+)\s*\)/g,
    (match, alertMessage) => {
      return `toast.success(${alertMessage})`
    }
  )

  return content
}

// Funcție pentru a adăuga modala de confirmare la sfârșitul componentei
function addConfirmModal(content) {
  if (content.includes('<ConfirmModal')) {
    return content // Already has modal
  }

  // Find the last </Layout> or </div> before the closing of the component
  const layoutCloseMatch = content.match(/<\/Layout>\s*\)\s*}\s*$/m)
  if (layoutCloseMatch) {
    const modalCode = `
        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={confirmState.isOpen}
          onClose={close}
          onConfirm={confirmState.onConfirm}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          type={confirmState.type}
        />
      </div>
    </Layout>
  )`
    
    return content.replace(/<\/Layout>\s*\)\s*}\s*$/m, modalCode)
  }
  
  return content
}

// Procesează fiecare fișier
filesToUpdate.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath)
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`)
    return
  }

  let content = fs.readFileSync(fullPath, 'utf8')
  
  // Skip if already processed
  if (content.includes('import ConfirmModal') && content.includes('useConfirm')) {
    console.log(`Already processed: ${filePath}`)
    return
  }

  // Apply transformations
  content = addImports(content)
  content = addConfirmHook(content)
  content = replaceConfirms(content)
  content = addConfirmModal(content)

  // Write back to file
  fs.writeFileSync(fullPath, content, 'utf8')
  console.log(`Updated: ${filePath}`)
})

console.log('All files processed!')
