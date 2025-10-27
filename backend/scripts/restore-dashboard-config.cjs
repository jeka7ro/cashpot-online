require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cashpot',
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
})

const defaultDashboardConfig = {
  statCards: [
    { id: 'companies', title: 'Companii', visible: true, order: 1 },
    { id: 'locations', title: 'Locații', visible: true, order: 2 },
    { id: 'providers', title: 'Furnizori', visible: true, order: 3 },
    { id: 'cabinets', title: 'Cabinete', visible: true, order: 4 },
    { id: 'gameMixes', title: 'Game Mixes', visible: true, order: 5 },
    { id: 'slots', title: 'Sloturi', visible: true, order: 6 },
    { id: 'games', title: 'Librărie Jocuri', visible: true, order: 7 },
    { id: 'warehouse', title: 'Depozit', visible: true, order: 8 },
    { id: 'metrology', title: 'Metrologie', visible: true, order: 9 },
    { id: 'jackpots', title: 'Jackpots', visible: false, order: 10 },
    { id: 'invoices', title: 'Facturi', visible: false, order: 11 },
    { id: 'onjnReports', title: 'Rapoarte ONJN', visible: true, order: 12 },
    { id: 'legalDocuments', title: 'Documente Legale', visible: false, order: 13 },
    { id: 'users', title: 'Utilizatori', visible: false, order: 14 }
  ],
  widgets: [
    { id: 'quickActions', title: 'Acțiuni Rapide', visible: true, order: 1 },
    { id: 'recentActivity', title: 'Activitate Recentă', visible: true, order: 2 },
    { id: 'databaseBackup', title: 'Backup Bază de Date', visible: true, order: 3 },
    { id: 'currencyRate', title: 'Curs Valutar ONJN', visible: true, order: 4 },
    { id: 'onjnCalendar', title: 'Calendar ONJN', visible: true, order: 5 },
    { id: 'systemHealth', title: 'Sănătate Sistem', visible: true, order: 6 },
    { id: 'gamesLibrary', title: 'Librărie Jocuri', visible: false, order: 7 },
    { id: 'tasks', title: 'Sarcini', visible: false, order: 8 }
  ]
}

const defaultCardSizes = {
  companies: 'medium',
  locations: 'medium',
  providers: 'medium',
  cabinets: 'medium',
  gameMixes: 'medium',
  slots: 'medium',
  games: 'medium',
  warehouse: 'medium',
  metrology: 'medium',
  jackpots: 'medium',
  invoices: 'medium',
  onjnReports: 'medium',
  legalDocuments: 'medium',
  users: 'medium'
}

const defaultWidgetSizes = {
  quickActions: 'medium',
  recentActivity: 'medium',
  databaseBackup: 'medium',
  currencyRate: 'small',
  onjnCalendar: 'large',
  systemHealth: 'large',
  gamesLibrary: 'large',
  tasks: 'medium'
}

async function restoreDashboardConfig() {
  try {
    // Get user ID from command line arguments or use default
    const userId = process.argv[2] || '1'
    
    console.log(`🔄 Restoring dashboard configuration for user ID: ${userId}...`)
    
    // Create preferences object
    const preferences = {
      dashboard: defaultDashboardConfig,
      cardSizes: defaultCardSizes,
      widgetSizes: defaultWidgetSizes
    }
    
    // Update user preferences
    const result = await pool.query(
      'UPDATE users SET preferences = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, preferences',
      [JSON.stringify(preferences), userId]
    )
    
    if (result.rows.length === 0) {
      console.error('❌ User not found')
      process.exit(1)
    }
    
    console.log('✅ Dashboard configuration restored successfully!')
    console.log('📊 User:', result.rows[0].username)
    console.log('🔧 Preferences:', JSON.stringify(preferences, null, 2))
    
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error restoring dashboard configuration:', error)
    await pool.end()
    process.exit(1)
  }
}

restoreDashboardConfig()
