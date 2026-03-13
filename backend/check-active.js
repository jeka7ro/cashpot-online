import mysql from 'mysql2/promise';

const dbInfo = {
  host: process.env.CYBER_DB_HOST || '161.97.133.165',
  port: Number(process.env.CYBER_DB_PORT || 3306),
  user: process.env.CYBER_DB_USER || 'eugen',
  password: process.env.CYBER_DB_PASSWORD || '(@Ee0wRHVohZww33',
  database: process.env.CYBER_DB_NAME || 'cyberslot_dbn'
};

async function test() {
  const c = await mysql.createConnection(dbInfo);
  try {
     const [sample] = await c.query('SELECT COUNT(*) as cnt, machine_id FROM machine_audit_games_g_s GROUP BY machine_id ORDER BY cnt DESC LIMIT 5');
     console.log('Rows per machine in g_s:', sample);
  } catch(e) { console.log(e.message); }
  
  process.exit(0);
}
test();
