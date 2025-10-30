// ConexionBDD.js
const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 60000, // 60 segundos de timeout
  ssl: {
    rejectUnauthorized: false // Necesario para Railway
  },
  timezone: '-06:00'
});

db.connect(err => {
  if (err) {
    console.error('❌ Error de conexión a la base de datos:', err);
    console.error('Verifica que:');
    console.error('1. Las credenciales en .env sean correctas');
    console.error('2. La base de datos de Railway esté activa');
    console.error('3. Tu conexión a internet funcione correctamente');
  } else {
    console.log('✅ Conectado a la base de datos MySQL en Railway');
    console.log(`📍 Host: ${process.env.DB_HOST}`);
    console.log('✅ Zona horaria configurada a Guatemala (UTC-6)');

    // Configurar zona horaria por si acaso
    db.execute("SET time_zone = '-06:00'");
  }
});

module.exports = db;
