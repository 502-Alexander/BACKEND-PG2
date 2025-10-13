const express = require('express');
const router = express.Router();
const db = require('../ConexionBDD');

// ========================================
// 🟢 Ruta POST - Registrar venta
// ========================================
router.post('/', (req, res) => {
  const { id_usuario, nombre_cajero, total, efectivo, cambio, productos } = req.body;

  // Validar datos obligatorios
  if (!id_usuario || !total || !productos || productos.length === 0) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  // Iniciar transacción
  db.beginTransaction((err) => {
    if (err) {
      console.error('Error al iniciar transacción:', err);
      return res.status(500).json({ error: 'Error al iniciar transacción' });
    }

    // 1️⃣ Insertar la venta en la tabla salidas (encabezado de venta)
    const insertarVentaSql = `
      INSERT INTO salidas (id_usuario, nombre_cajero, fecha, total, efectivo, cambio)
      VALUES (?, ?, NOW(), ?, ?, ?)
    `;

    db.query(insertarVentaSql, [id_usuario, nombre_cajero, total, efectivo, cambio], (err, result) => {
      if (err) {
        console.error('Error al insertar venta:', err);
        return db.rollback(() => {
          res.status(500).json({ error: 'Error al registrar la venta' });
        });
      }

      const id_salida = result.insertId;

      // 2️⃣ Insertar los detalles de la venta
      const insertarDetallesSql = `
        INSERT INTO detalle_salidas (id_salida, id_producto, cantidad, precio_unitario, total)
        VALUES ?
      `;

      const detallesValues = productos.map(p => [
        id_salida,
        p.id_producto,
        p.cantidad,
        p.precio_unitario,
        p.total
      ]);

      db.query(insertarDetallesSql, [detallesValues], (err) => {
        if (err) {
          console.error('Error al insertar detalles de venta:', err);
          return db.rollback(() => {
            res.status(500).json({ error: 'Error al registrar los detalles de la venta' });
          });
        }

        // 3️⃣ El trigger actualizar_stock_venta se encarga de:
        //    - Actualizar el stock automáticamente
        //    - Registrar el movimiento en la tabla movimientos
        
        // Confirmar transacción
        db.commit((err) => {
          if (err) {
            console.error('Error al confirmar transacción:', err);
            return db.rollback(() => {
              res.status(500).json({ error: 'Error al confirmar la venta' });
            });
          }

          console.log('✅ Venta registrada correctamente:', id_salida);
          res.status(201).json({
            mensaje: 'Venta registrada correctamente',
            id_salida: id_salida,
            total: total,
            cambio: cambio
          });
        });
      });
    });
  });
});

// ========================================
// 🟢 Ruta GET - Obtener todas las ventas
// ========================================
router.get('/', (req, res) => {
  const sql = `
    SELECT s.*, u.nombre_usuario
    FROM salidas s
    LEFT JOIN usuarios u ON s.id_usuario = u.id_usuario
    ORDER BY s.fecha DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener ventas:', err);
      return res.status(500).json({ error: 'Error al obtener ventas' });
    }
    res.json(results);
  });
});

// ========================================
// 🟢 Ruta GET - Obtener ventas del cajero del día con detalles
// ⚠️ IMPORTANTE: Esta ruta debe estar ANTES de /:id_salida
// ========================================
router.get('/cajero/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  // Consulta para obtener las ventas
  const sqlVentas = `
    SELECT 
      s.id_salida as id_venta,
      s.fecha as fecha_venta,
      s.total,
      s.efectivo,
      s.cambio,
      s.nombre_cajero
    FROM salidas s
    WHERE s.id_usuario = ?
      AND DATE(s.fecha) = CURDATE()
    ORDER BY s.fecha DESC
  `;

  db.query(sqlVentas, [id_usuario], (err, ventas) => {
    if (err) {
      console.error('Error al obtener ventas del cajero:', err);
      return res.status(500).json({ error: 'Error al obtener ventas del cajero' });
    }

    // Si no hay ventas, retornar array vacío
    if (ventas.length === 0) {
      return res.json([]);
    }

    // Obtener los IDs de las ventas
    const idsVentas = ventas.map(v => v.id_venta);

    // Consulta para obtener los detalles de todas las ventas
    const sqlDetalles = `
      SELECT 
        ds.id_salida,
        ds.cantidad,
        ds.precio_unitario,
        ds.total as subtotal,
        p.nombre_producto,
        p.codigo_barras
      FROM detalle_salidas ds
      INNER JOIN productos p ON ds.id_producto = p.id_producto
      WHERE ds.id_salida IN (?)
      ORDER BY ds.id_salida, p.nombre_producto
    `;

    db.query(sqlDetalles, [idsVentas], (err, detalles) => {
      if (err) {
        console.error('Error al obtener detalles de ventas:', err);
        return res.status(500).json({ error: 'Error al obtener detalles de ventas' });
      }

      // Agrupar detalles por venta
      const ventasConDetalles = ventas.map(venta => ({
        ...venta,
        productos: detalles.filter(d => d.id_salida === venta.id_venta)
      }));

      console.log(`✅ Ventas del cajero ${id_usuario}:`, ventasConDetalles.length);
      res.json(ventasConDetalles);
    });
  });
});

// ========================================
// 🟢 Ruta GET - Obtener detalles de una venta
// ⚠️ Esta ruta debe estar DESPUÉS de /cajero/:id_usuario
// ========================================
router.get('/:id_salida', (req, res) => {
  const { id_salida } = req.params;

  const sql = `
    SELECT ds.*, p.nombre_producto, p.codigo_barras
    FROM detalle_salidas ds
    LEFT JOIN productos p ON ds.id_producto = p.id_producto
    WHERE ds.id_salida = ?
  `;

  db.query(sql, [id_salida], (err, results) => {
    if (err) {
      console.error('Error al obtener detalles de venta:', err);
      return res.status(500).json({ error: 'Error al obtener detalles de venta' });
    }
    res.json(results);
  });
});

module.exports = router;
