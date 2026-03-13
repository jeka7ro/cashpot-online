import cron from 'node-cron';
import TelegramBot from 'node-telegram-bot-api';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Postgres Connection (Mirroring server-postgres.js)
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Setup Telegram Bot
const botToken = process.env.TELEGRAM_BOT_TOKEN_OPERATIONAL;
const chatId = process.env.TELEGRAM_OPERATIONAL_GROUP_ID;

let bot = null;
if (botToken) {
    bot = new TelegramBot(botToken, { polling: false });
    console.log('[Cron] Telegram Bot initialized for Operational alerts.');
} else {
    console.warn('[Cron] TELEGRAM_BOT_TOKEN_OPERATIONAL missing. Alerts will only be logged to console.');
}

async function checkEfficiency() {
    console.log(`[Cron] Running Efficiency Check at ${new Date().toISOString()}...`);
    
    // We check the PREVIOUS hour that just ended
    // If it's 15:01, we want to check hour 14.
    const now = new Date();
    // To handle hour 0 (midnight), previous hour is 23 of the previous day
    const checkDate = new Date(now);
    checkDate.setHours(checkDate.getHours() - 1);
    
    const targetHour = checkDate.getHours();
    
    // Format date as YYYY-MM-DD
    const yyyy = checkDate.getFullYear();
    const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
    const dd = String(checkDate.getDate()).padStart(2, '0');
    const targetDateStr = `${yyyy}-${mm}-${dd}`;

    try {
        // 1. Get Capacity per Venue
        const capacityRes = await pgPool.query(`
            SELECT 
                "Venue", 
                COUNT(*) as total_machines 
            FROM op_multigames 
            GROUP BY "Venue"
        `);
        const capacityMap = {};
        capacityRes.rows.forEach(r => {
            capacityMap[r.Venue] = Number(r.total_machines);
        });

        // 2. Get the current hour's stats from performance mix and active machines
        // We need Active Machines for Occupancy, and Performance Mix for Avr Bet
        
        // Active Machines for target hour
        const activeRes = await pgPool.query(`
            SELECT "Venue", hour, active_machines
            FROM op_active_machines
            WHERE DATE(date) = $1 AND hour = $2
        `, [targetDateStr, targetHour]);
        
        // Performance Mix for target hour
        const perfRes = await pgPool.query(`
            SELECT "Venue", hour, games_played, total_in
            FROM op_performance_mix
            WHERE DATE(date) = $1 AND hour = $2
        `, [targetDateStr, targetHour]);

        // Combine data
        const currentStats = {};
        activeRes.rows.forEach(r => {
            if (!currentStats[r.Venue]) currentStats[r.Venue] = {};
            currentStats[r.Venue].activeMachines = Number(r.active_machines);
        });

        perfRes.rows.forEach(r => {
            if (!currentStats[r.Venue]) currentStats[r.Venue] = {};
            currentStats[r.Venue].gamesPlayed = Number(r.games_played);
            currentStats[r.Venue].totalIn = Number(r.total_in);
            currentStats[r.Venue].avrBet = currentStats[r.Venue].gamesPlayed > 0 
                ? (currentStats[r.Venue].totalIn / currentStats[r.Venue].gamesPlayed) 
                : 0;
        });

        // 3. Get historical Average Bet for the same hour for ALL dates BEFORE targetDate
        const historyRes = await pgPool.query(`
            SELECT 
                "Venue", 
                SUM(total_in) as sum_in, 
                SUM(games_played) as sum_games 
            FROM op_performance_mix
            WHERE hour = $1 AND DATE(date) < $2
            GROUP BY "Venue"
        `, [targetHour, targetDateStr]);

        const historyMap = {};
        historyRes.rows.forEach(r => {
            const sumIn = Number(r.sum_in);
            const sumGp = Number(r.sum_games);
            historyMap[r.Venue] = sumGp > 0 ? (sumIn / sumGp) : 0;
        });

        // 4. Evaluate alerts
        for (const venue of Object.keys(currentStats)) {
            const stats = currentStats[venue];
            const capacity = capacityMap[venue] || 0;
            const active = stats.activeMachines || 0;
            const currentAvrBet = stats.avrBet || 0;
            const historicalAvrBet = historyMap[venue] || 0;

            if (capacity === 0) continue;

            const occupancyPct = (active / capacity) * 100;

            // Trigger Condition: Occupancy > 70% AND Current AvrBet < HistoricalAvrBet * 0.7 (30% drop)
            if (occupancyPct > 70 && currentAvrBet > 0 && historicalAvrBet > 0) {
                if (currentAvrBet < (historicalAvrBet * 0.7)) {
                    // Trigger Alert!
                    const message = 
`⚠️ *Alertă Eficiență - ${venue}*
🕒 Interval: ${targetHour.toString().padStart(2, '0')}:00 - ${(targetHour+1).toString().padStart(2, '0')}:00
🎰 Ocupare: ${active}/${capacity} aparate (Grad: ${occupancyPct.toFixed(1)}%)
📉 *Status:* Sala este plină, dar volumul de joc (Bet) este neobișnuit de scăzut.
💰 Avr Bet Actual: ${(currentAvrBet/100).toFixed(2)} RON vs. Medie: ${(historicalAvrBet/100).toFixed(2)} RON
📢 *Recomandare:* Verifică atmosfera în sală / tipologia clienților prezenți.`;

                    console.log(`[Cron] Triggered Alert for ${venue}`);
                    
                    if (bot && chatId) {
                        try {
                            await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                        } catch (err) {
                            console.error('[Cron] Failed to send Telegram message:', err.message);
                        }
                    } else {
                        console.log('--- Telegram Message Draft ---');
                        console.log(message);
                        console.log('------------------------------');
                    }
                }
            }
        }

    } catch (error) {
        console.error('[Cron] Error running Efficiency Check:', error);
    }
}

// Schedule the cron job to run at minute 5 of every hour
// e.g. at 14:05, it will check the data for hour 13.
export function initEfficiencyCron() {
    console.log('[Cron] Scheduling Efficiency Alerts (Hourly at minute 5)');
    cron.schedule('5 * * * *', () => {
        checkEfficiency();
    });
}
