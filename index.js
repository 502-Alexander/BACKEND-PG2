// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar CORS para permitir conexiones desde dispositivos móviles y producción
app.use(cors({
  origin: '*', // Permite todas las conexiones (puedes restringir después)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Importar Rutas
const productosRoutes = require('./routes/productos');
const categoriasRoutes = require('./routes/categorias');
const entradasRoutes = require('./routes/entradas');
const movimientosRoutes = require('./routes/movimientosP');
const loginRoutes = require('./routes/login');
const proveedoresRoutes = require('./routes/proveedores.js');
const salidasRoutes = require('./routes/salidas');
const ventasRoutes = require('./routes/ventas');

// Usar Rutas
app.use('/api/productos', productosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/entradas', entradasRoutes);
app.use('/api/movimientos', movimientosRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/salidas', salidasRoutes);
app.use('/api/ventas', ventasRoutes);


// Ruta Raíz
app.get('/', (req, res) => {
  res.send('Backend SOWIN funcionando');
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://0.0.0.0:${PORT}`);
});
