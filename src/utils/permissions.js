// Permission constants and configuration

export const MODULES = {
  DASHBOARD: 'dashboard',
  COMPANIES: 'companies',
  LOCATIONS: 'locations',
  PROVIDERS: 'providers',
  CABINETS: 'cabinets',
  GAME_MIXES: 'gameMixes',
  SLOTS: 'slots',
  WAREHOUSE: 'warehouse',
  METROLOGY: 'metrology',
  JACKPOTS: 'jackpots',
  INVOICES: 'invoices',
  ONJN: 'onjn',
  LEGAL: 'legal',
  USERS: 'users',
  SETTINGS: 'settings',
  CONTRACTS: 'contracts',
  CYBER_IMPORT: 'cyberImport',
  MARKETING: 'marketing',
  EXPENDITURES: 'expenditures'
}

export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  EXPORT: 'export',
  IMPORT: 'import'
}

// Module configuration with available actions
export const MODULE_CONFIG = {
  [MODULES.DASHBOARD]: {
    label: '📊 Dashboard',
    actions: [ACTIONS.VIEW, ACTIONS.EDIT]
  },
  [MODULES.COMPANIES]: {
    label: '🏢 Companii',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT]
  },
  [MODULES.LOCATIONS]: {
    label: '📍 Locații',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT]
  },
  [MODULES.PROVIDERS]: {
    label: '🎮 Furnizori',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT]
  },
  [MODULES.CABINETS]: {
    label: '🎰 Cabinete',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT]
  },
  [MODULES.GAME_MIXES]: {
    label: '🎲 Game Mixes',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT]
  },
  [MODULES.SLOTS]: {
    label: '🍒 Sloturi',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT, ACTIONS.IMPORT]
  },
  [MODULES.WAREHOUSE]: {
    label: '📦 Depozit',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT]
  },
  [MODULES.METROLOGY]: {
    label: '⚖️ Metrologie',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT]
  },
  [MODULES.CONTRACTS]: {
    label: '📄 Contracte',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT]
  },
  [MODULES.INVOICES]: {
    label: '🧾 Facturi',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT]
  },
  [MODULES.JACKPOTS]: {
    label: '💰 Jackpot-uri',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE]
  },
  [MODULES.ONJN]: {
    label: '⚖️ ONJN',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT]
  },
  [MODULES.LEGAL]: {
    label: '📋 Legal',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT]
  },
  [MODULES.USERS]: {
    label: '👥 Utilizatori',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE]
  },
  [MODULES.SETTINGS]: {
    label: '⚙️ Setări',
    actions: [ACTIONS.VIEW, ACTIONS.EDIT]
  },
  [MODULES.CYBER_IMPORT]: {
    label: '🔄 Import Cyber',
    actions: [ACTIONS.VIEW, ACTIONS.IMPORT]
  },
  [MODULES.MARKETING]: {
    label: '📢 Marketing & Promoții',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.EXPORT]
  },
  [MODULES.EXPENDITURES]: {
    label: '💰 Cheltuieli',
    actions: [ACTIONS.VIEW, ACTIONS.EDIT, ACTIONS.EXPORT, ACTIONS.IMPORT]
  }
}

// Action labels in Romanian
export const ACTION_LABELS = {
  [ACTIONS.VIEW]: 'Vizualizare',
  [ACTIONS.CREATE]: 'Creare',
  [ACTIONS.EDIT]: 'Editare',
  [ACTIONS.DELETE]: 'Ștergere',
  [ACTIONS.EXPORT]: 'Export',
  [ACTIONS.IMPORT]: 'Import'
}

// Default permissions for each role
export const DEFAULT_PERMISSIONS = {
  admin: {
    // Admin has all permissions
    ...Object.keys(MODULES).reduce((acc, moduleKey) => {
      const module = MODULES[moduleKey]
      acc[module] = MODULE_CONFIG[module].actions.reduce((actions, action) => {
        actions[action] = true
        return actions
      }, {})
      return acc
    }, {})
  },
  manager: {
    // Manager has all except user management and critical deletes
    [MODULES.DASHBOARD]: { view: true, edit: true },
    [MODULES.COMPANIES]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.LOCATIONS]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.PROVIDERS]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.CABINETS]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.GAME_MIXES]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.SLOTS]: { view: true, create: true, edit: true, delete: false, export: true, import: true },
    [MODULES.WAREHOUSE]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.METROLOGY]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.CONTRACTS]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.INVOICES]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.JACKPOTS]: { view: true, create: true, edit: true, delete: false },
    [MODULES.ONJN]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.LEGAL]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.USERS]: { view: true, create: false, edit: false, delete: false },
    [MODULES.SETTINGS]: { view: true, edit: false },
    [MODULES.CYBER_IMPORT]: { view: true, import: true },
    [MODULES.MARKETING]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.EXPENDITURES]: { view: true, edit: true, export: true, import: true }
  },
  user: {
    // User has mostly view permissions
    [MODULES.DASHBOARD]: { view: true, edit: false },
    [MODULES.COMPANIES]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.LOCATIONS]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.PROVIDERS]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.CABINETS]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.GAME_MIXES]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.SLOTS]: { view: true, create: false, edit: false, delete: false, export: true, import: false },
    [MODULES.WAREHOUSE]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.METROLOGY]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.CONTRACTS]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.INVOICES]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.JACKPOTS]: { view: true, create: false, edit: false, delete: false },
    [MODULES.ONJN]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.LEGAL]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.USERS]: { view: false, create: false, edit: false, delete: false },
    [MODULES.SETTINGS]: { view: false, edit: false },
    [MODULES.CYBER_IMPORT]: { view: false, import: false },
    [MODULES.MARKETING]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.EXPENDITURES]: { view: true, edit: false, export: true, import: false }
  },
  marketing: {
    [MODULES.DASHBOARD]: { view: true, edit: false },
    [MODULES.COMPANIES]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.LOCATIONS]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.PROVIDERS]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.CABINETS]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.GAME_MIXES]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.SLOTS]: { view: true, create: false, edit: false, delete: false, export: true, import: false },
    [MODULES.WAREHOUSE]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.METROLOGY]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.CONTRACTS]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.INVOICES]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.JACKPOTS]: { view: true, create: false, edit: false, delete: false },
    [MODULES.ONJN]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.LEGAL]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.USERS]: { view: false, create: false, edit: false, delete: false },
    [MODULES.SETTINGS]: { view: false, edit: false },
    [MODULES.CYBER_IMPORT]: { view: false, import: false },
    [MODULES.MARKETING]: { view: true, create: true, edit: true, delete: true, export: true },
    [MODULES.EXPENDITURES]: { view: false, edit: false, export: false, import: false }
  },
  operational: {
    [MODULES.DASHBOARD]: { view: true, edit: false },
    [MODULES.COMPANIES]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.LOCATIONS]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.PROVIDERS]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.CABINETS]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.GAME_MIXES]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.SLOTS]: { view: true, create: true, edit: true, delete: false, export: true, import: true },
    [MODULES.WAREHOUSE]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.METROLOGY]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.CONTRACTS]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.INVOICES]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.JACKPOTS]: { view: true, create: false, edit: false, delete: false },
    [MODULES.ONJN]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.LEGAL]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.USERS]: { view: false, create: false, edit: false, delete: false },
    [MODULES.SETTINGS]: { view: false, edit: false },
    [MODULES.CYBER_IMPORT]: { view: true, import: true },
    [MODULES.MARKETING]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.EXPENDITURES]: { view: true, edit: false, export: true, import: false }
  },
  financiar: {
    [MODULES.DASHBOARD]: { view: true, edit: false },
    [MODULES.COMPANIES]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.LOCATIONS]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.PROVIDERS]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.CABINETS]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.GAME_MIXES]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.SLOTS]: { view: true, create: false, edit: false, delete: false, export: true, import: false },
    [MODULES.WAREHOUSE]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.METROLOGY]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.CONTRACTS]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.INVOICES]: { view: true, create: true, edit: true, delete: false, export: true },
    [MODULES.JACKPOTS]: { view: true, create: false, edit: false, delete: false },
    [MODULES.ONJN]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.LEGAL]: { view: false, create: false, edit: false, delete: false, export: false },
    [MODULES.USERS]: { view: false, create: false, edit: false, delete: false },
    [MODULES.SETTINGS]: { view: false, edit: false },
    [MODULES.CYBER_IMPORT]: { view: false, import: false },
    [MODULES.MARKETING]: { view: true, create: false, edit: false, delete: false, export: true },
    [MODULES.EXPENDITURES]: { view: true, edit: true, export: true, import: true }
  }
}

// Helper function to check if user has permission
export const hasPermission = (userPermissions, module, action) => {
  if (!userPermissions || !userPermissions[module]) return false
  return userPermissions[module][action] === true
}

// Helper function to get permissions for a role
export const getDefaultPermissionsForRole = (role) => {
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.user
}

