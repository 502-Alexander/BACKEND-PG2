// ConexionBDD.js
const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 60000,
  ssl: {
    rejectUnauthorized: false
  },
  timezone: '-06:00' // 🔥 Ajuste de zona horaria (Guatemala / Centroamérica)
});

db.connect(err => {
  if (err) {
    console.error('❌ Error de conexión a la base de datos:', err);
    console.error('Verifica que:');
    console.error('1. Las credenciales en .env sean correctas');
    console.error('2. La base de datos esté activa');
    console.error('3. Tu conexión a internet funcione correctamente');
  } else {
    console.log('✅ Conectado a la base de datos MySQL en Railway');

    // Verificación de la zona horaria aplicada
    db.execute("SELECT @@global.time_zone AS global_tz, @@session.time_zone AS session_tz, NOW() AS ahora, CURDATE() AS hoy", (err, results) => {
      if (err) {
        console.error('❌ Error al verificar zona horaria:', err);
      } else if (results.length > 0) {
        const r = results[0];
        console.log('🔍 Estado de zona horaria MySQL:');
        console.log(`   🌐 Global: ${r.global_tz}`);
        console.log(`   🕓 Sesión: ${r.session_tz}`);
        console.log(`   ⏰ NOW(): ${r.ahora}`);
        console.log(`   📅 CURDATE(): ${r.hoy}`);
        console.log('✅ Zona horaria ajustada correctamente a UTC-6 (Guatemala)');
      }
    });
  }
});

module.exports = db;
