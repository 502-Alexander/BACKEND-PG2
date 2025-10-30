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
  }
  // QUITAMOS timezone de aquí por ahora
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
    
    // PRIMERO: Verificar la zona horaria actual
    db.execute("SELECT @@global.time_zone, @@session.time_zone, NOW(), CURDATE()", (err, results) => {
      if (err) {
        console.error('❌ Error al verificar zona horaria:', err);
        return;
      }
      
      console.log('🔍 Estado actual:');
      console.log(`   Zona global: ${results[0]['@@global.time_zone']}`);
      console.log(`   Zona sesión: ${results[0]['@@session.time_zone']}`);
      console.log(`   NOW(): ${results[0]['NOW()']}`);
      console.log(`   CURDATE(): ${results[0]['CURDATE()']}`);
      
      // SEGUNDO: Configurar zona horaria
      db.execute("SET time_zone = '-06:00'", (error) => {
        if (error) {
          console.error('❌ Error al configurar zona horaria:', error);
          return;
        }
        
        console.log('✅ Zona horaria configurada a Guatemala (UTC-6)');
        
        // TERCERO: Verificar que se aplicó
        db.execute("SELECT NOW() as ahora, CURDATE() as hoy", (err, results) => {
          if (!err && results.length > 0) {
            console.log('🎯 Después de configurar:');
            console.log(`   NOW(): ${results[0].ahora}`);
            console.log(`   CURDATE(): ${results[0].hoy}`);
            console.log('📍 La fecha debería ser la actual de Guatemala');
          }
        });
      });
    });
  }
});

module.exports = db;
