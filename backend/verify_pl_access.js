import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from current directory (backend/)
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Mock request object similar to what express receives
const mockReq = {
    user: {
        id: 11, // Valentica
        role: 'financiar',
        permissions: { incasari: { view: true } }
    },
    query: {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
    }
};

async function testAccessLogic() {
    try {
        console.log('Testing access logic for user:', mockReq.user);

        // Simulate logic from incasari.js
        const locationsArray = undefined; // No query filters

        // Fetch user settings
        const settingsResult = await pool.query('SELECT preferences FROM users WHERE id = $1', [mockReq.user.id]);
        const preferences = settingsResult.rows[0]?.preferences?.expendituresSettings || {};
        const includedFilters = { locations: preferences.includedLocations || [] }; // Likely empty

        console.log('User locations filter:', includedFilters.locations);

        // THE FIX LOGIC
        const isAdmin = mockReq.user.role === 'admin';
        const hasViewPermission = mockReq.user.permissions?.incasari?.view === true || mockReq.user.role === 'financiar';

        console.log('Is Admin:', isAdmin);
        console.log('Has View Permission:', hasViewPermission);

        if (!isAdmin && !hasViewPermission && (!locationsArray || locationsArray.length === 0) && (!includedFilters.locations || includedFilters.locations.length === 0)) {
            console.log('🛑 BLOCKED (Simulation)');
        } else {
            console.log('✅ ALLOWED (Simulation)');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

testAccessLogic();
