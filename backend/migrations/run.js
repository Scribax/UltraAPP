require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

async function runMigrations() {
  console.log('🚀 Ejecutando migraciones...');
  const files = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
    console.log(`  ▶ ${file}`);
    await db.query(sql);
    console.log(`  ✅ ${file} completado`);
  }
  console.log('✨ Todas las migraciones completadas.');
  process.exit(0);
}

runMigrations().catch(err => {
  console.error('❌ Error en migración:', err.message);
  process.exit(1);
});
